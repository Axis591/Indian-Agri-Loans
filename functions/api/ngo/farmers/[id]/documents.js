import { auditNgo, jsonResponse, requireNgoUser, requireSameOrigin } from "../../../../_lib/ngo.js";

const MAX_BYTES = 5 * 1024 * 1024;
const docTypes = new Set(["redacted_land_record","cultivation_proof","crop_or_activity_photo","group_registration","other_redacted_support"]);

function detectedType(bytes) {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return "application/pdf";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return "";
}

export async function onRequestGet(context) {
  const auth = await requireNgoUser(context);
  if (!auth.ok) return auth.response;
  const farmerId = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(farmerId)) return jsonResponse({ error: "Invalid farmer profile identifier." }, 400);
  const farmer = await context.env.NGO_DB.prepare("SELECT id FROM ngo_farmers WHERE id = ? AND org_id = ? LIMIT 1").bind(farmerId,auth.user.org_id).first();
  if (!farmer) return jsonResponse({ error: "Farmer profile not found." }, 404);
  const rows = await context.env.NGO_DB.prepare(
    "SELECT id, doc_type, file_name, mime_type, size_bytes, review_status, created_at FROM ngo_farmer_documents WHERE farmer_id = ? AND org_id = ? ORDER BY created_at DESC"
  ).bind(farmerId,auth.user.org_id).all();
  return jsonResponse({ documents: rows.results || [] });
}

export async function onRequestPost(context) {
  const auth = await requireNgoUser(context, ["admin","editor"]);
  if (!auth.ok) return auth.response;
  if (!requireSameOrigin(context.request)) return jsonResponse({ error: "Cross-origin request rejected." }, 403);
  if (!context.env.NGO_DOCS) return jsonResponse({ error: "Private document storage is not configured.", code: "NGO_DOCS_NOT_CONFIGURED" }, 503);
  const size = Number(context.request.headers.get("Content-Length") || 0);
  if (size > MAX_BYTES + 20000) return jsonResponse({ error: "File exceeds the 5 MB limit." }, 413);
  const farmerId = String(context.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(farmerId)) return jsonResponse({ error: "Invalid farmer profile identifier." }, 400);
  const farmer = await context.env.NGO_DB.prepare("SELECT id FROM ngo_farmers WHERE id = ? AND org_id = ? LIMIT 1").bind(farmerId,auth.user.org_id).first();
  if (!farmer) return jsonResponse({ error: "Farmer profile not found." }, 404);
  let form;
  try { form = await context.request.formData(); }
  catch { return jsonResponse({ error: "Upload a supported document file." }, 400); }
  const file = form.get("file");
  const docType = String(form.get("docType") || "");
  if (!file || typeof file.arrayBuffer !== "function" || !docTypes.has(docType)) return jsonResponse({ error: "Choose a document category and one PDF, PNG or JPEG file." }, 400);
  if (file.size < 1 || file.size > MAX_BYTES) return jsonResponse({ error: "File must be no larger than 5 MB." }, 413);
  const bytes = new Uint8Array(await file.slice(0,8).arrayBuffer());
  const mime = detectedType(bytes);
  if (!mime || !["application/pdf","image/png","image/jpeg"].includes(file.type) || file.type !== mime) {
    return jsonResponse({ error: "File content does not match a permitted PDF, PNG or JPEG type." }, 400);
  }
  const id = crypto.randomUUID();
  const extension = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  const fileName = "supporting-document-" + id.slice(0,8) + "." + extension;
  const orgPath = String(auth.user.org_id).replace(/[^A-Za-z0-9_-]/g,"_").slice(0,80);
  const objectKey = "private/" + orgPath + "/farmers/" + farmerId + "/" + id;
  try {
    await context.env.NGO_DOCS.put(objectKey, file.stream(), {
      httpMetadata: { contentType: "application/octet-stream", cacheControl: "private, no-store" },
      customMetadata: { organisation: orgPath, farmerId, documentId: id, status: "pending_review" }
    });
    await context.env.NGO_DB.prepare(
      "INSERT INTO ngo_farmer_documents (id, org_id, farmer_id, doc_type, file_name, mime_type, size_bytes, object_key, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id,auth.user.org_id,farmerId,docType,fileName,mime,file.size,objectKey,auth.user.email).run();
  } catch {
    await context.env.NGO_DOCS.delete(objectKey).catch(() => {});
    return jsonResponse({ error: "The file could not be saved to private storage." }, 500);
  }
  await auditNgo(context.env,auth.user,"farmer.document_uploaded","ngo_farmer_document",id);
  return jsonResponse({ saved: true, id, fileName, reviewStatus: "pending_review" }, 201);
}

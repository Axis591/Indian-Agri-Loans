export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/?page=ngo&ngo-login=1", request.url), 302);
}

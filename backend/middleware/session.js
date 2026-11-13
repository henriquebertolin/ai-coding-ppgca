export function attachSession(context, sessionService) {
  const raw = context.request.headers
    .get('cookie')
    ?.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith('ve_cart='))
    ?.slice(8);
  const session = sessionService.resolve(raw);
  context.session = session.id;
  if (session.newToken)
    context.headers['Set-Cookie'] =
      `ve_cart=${session.newToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${context.url.protocol === 'https:' ? '; Secure' : ''}`;
}

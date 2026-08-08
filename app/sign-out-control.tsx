export function SignOutControl({ href }: { href: string }) {
  if (!href.startsWith("/auth/signout")) return <a href={href}>Sign out</a>;

  const returnTo = new URL(href, "https://app.local").searchParams.get("return_to") ?? "/";
  return (
    <form action="/auth/signout" method="post">
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className="signout-link" type="submit">Sign out</button>
    </form>
  );
}

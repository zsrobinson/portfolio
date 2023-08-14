import { Badge } from "./ui/badge";

// We're unable to take advantage of the Badge component's asChild prop from
// within Astro, so instead we have to use this component for links so that we
// don't have an anchor tag wrapping a div.

type Props = {
  href: string;
  target?: string;
} & React.ComponentPropsWithoutRef<typeof Badge>;

export function LinkBadge({ href, target, children, ...rest }: Props) {
  return (
    <Badge {...rest} asChild>
      <a href={href} target={target}>
        {children}
      </a>
    </Badge>
  );
}

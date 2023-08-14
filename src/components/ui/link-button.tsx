import type { ReactNode } from "react";
import { Button } from "./button";

// We're unable to take advantage of the Button component's asChild prop from
// within Astro, so instead we have to use this component for links so that we
// don't have an anchor tag wrapping a button.

type Props = {
  href: string;
  target?: string;
  children?: ReactNode;
} & React.ComponentPropsWithoutRef<typeof Button>;

export function LinkButton({ href, target, children, ...rest }: Props) {
  return (
    <Button {...rest} asChild>
      <a href={href} target={target}>
        {children}
      </a>
    </Button>
  );
}

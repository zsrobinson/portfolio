type Props = React.ComponentPropsWithoutRef<"a">;

// Styles inspired by outline button, though with lighter background on hover

export function LinkCard({ children, ...rest }: Props) {
  return (
    <a
      {...rest}
      className="rounded-lg border border-border text-card-foreground px-4 py-4 bg-accent/70 dark:bg-accent/30 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 ring-offset-background"
    >
      {children}
    </a>
  );
}

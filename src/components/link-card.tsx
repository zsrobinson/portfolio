type Props = React.ComponentPropsWithoutRef<"a">;

// Styles inspired by outline button, though with lighter background on hover

export function LinkCard({ children, ...rest }: Props) {
  return (
    <a
      {...rest}
      className="rounded-lg border border-border bg-accent/70 px-4 py-4 text-card-foreground shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 dark:bg-accent/30"
    >
      {children}
    </a>
  );
}

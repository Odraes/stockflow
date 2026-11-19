import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** A titled dashboard card with a consistent empty state. */
export function Panel({
  title,
  action,
  empty,
  isEmpty,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  empty: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="flex-1">
        {isEmpty ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTodos } from "@/hooks/api/useTodos";
import { PageLayout } from "@/components/layout/PageLayout";

export function Dashboard() {
  const { data: todos, isLoading } = useTodos();
  const navigate = useNavigate();

  return (
    <PageLayout title="Dashboard" description="Overview of your tasks">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Todos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{isLoading ? "--" : (todos?.length ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/todos")}>Add Todo</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p>All systems operational</p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

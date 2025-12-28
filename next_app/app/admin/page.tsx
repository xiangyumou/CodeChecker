import { prisma } from "@/lib/db";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Force dynamic rendering to ensure fresh data
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
    const requests = await prisma.request.findMany({
        orderBy: { created_at: "desc" },
        take: 50,
    });

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Button asChild>
                    <Link href="/">Back to Home</Link>
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Prompt</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.id}</TableCell>
                                    <TableCell className="max-w-[300px] truncate">
                                        {req.user_prompt || "No prompt"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                req.status === "Completed"
                                                    ? "default" // Map to default/primary
                                                    : req.status === "Failed"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                        >
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(req.created_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {/* Placeholder for detail view link */}
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/admin/requests/${req.id}`}>View</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

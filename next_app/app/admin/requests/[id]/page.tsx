import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";

export default async function RequestDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const requestId = parseInt(id);

    if (isNaN(requestId)) notFound();

    const request = await prisma.request.findUnique({
        where: { id: requestId },
    });

    if (!request) notFound();

    // Fetch logs related to this request? (Assuming source or context links it)
    // For now, simple view

    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Request #{request.id}</h1>
                <Button variant="outline" asChild>
                    <NextLink href="/admin">Back to Dashboard</NextLink>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between">
                            <span className="font-semibold">Status:</span>
                            <Badge
                                variant={
                                    request.status === "Completed"
                                        ? "default"
                                        : request.status === "Failed"
                                            ? "destructive"
                                            : "secondary"
                                }
                            >
                                {request.status}
                            </Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Created:</span>
                            <span>{new Date(request.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">Success:</span>
                            <span>{request.is_success ? "Yes" : "No"}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Code Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Simple stats or metadata */}
                        <p>Image References: {request.image_references || "None"}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md">
                        {request.user_prompt}
                    </pre>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>AI Response</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md max-h-[500px] overflow-auto">
                        {request.gpt_raw_response || "No response data available."}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
}

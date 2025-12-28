"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, StopCircle } from "lucide-react";
import { toast } from "sonner";

export function ChatForm() {
    const { messages, input, handleInputChange, handleSubmit, isLoading, stop, error } = useChat({
        api: "/api/chat",
        onError: (err) => {
            toast.error(`Error: ${err.message}`);
        },
    });

    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <Card className="w-full h-[600px] flex flex-col">
            <CardHeader>
                <CardTitle>AI Code Refactoring</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground mt-20">
                            Enter your code or request below to start analyzing.
                        </div>
                    )}
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"
                                }`}
                        >
                            <div
                                className={`max-w-[80%] rounded-lg px-4 py-2 ${m.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground whitespace-pre-wrap"
                                    }`}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {error && (
                        <div className="text-destructive text-sm text-center mt-2">
                            An error occurred. Please try again.
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
            <CardFooter className="p-4 pt-0">
                <form
                    onSubmit={handleSubmit}
                    className="relative w-full flex items-center gap-2"
                >
                    <Textarea
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Paste your code here..."
                        className="resize-none min-h-[50px] flex-1"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e as any);
                            }
                        }}
                    />
                    <div className="flex gap-2">
                        {isLoading ? (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => stop()}
                            >
                                <StopCircle className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button type="submit" size="icon" disabled={!input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </form>
            </CardFooter>
        </Card>
    );
}

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch("http://182.180.95.197:4000/upload/base64/", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Backend API failed" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("API Proxy Error:", err);
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}

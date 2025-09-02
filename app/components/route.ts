import { NextResponse } from "next/server";

export async function POST() {
  // Mock response (replace this with your actual API logic)
  const mockResponse = {
    documentType: "Emirates ID",
    data: {
      Name: "Ali Arsalan",
      "ID Number": "784-1987-1234567-1",
      Nationality: "Pakistan",
      DOB: "01-01-1990",
      "Expiry Date": "01-01-2030",
    },
  };

  return NextResponse.json(mockResponse);
}

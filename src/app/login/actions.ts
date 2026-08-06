"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl = formData.get("callbackUrl");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: typeof callbackUrl === "string" && callbackUrl ? callbackUrl : "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Correo o password incorrectos.";
    }
    throw error;
  }
}

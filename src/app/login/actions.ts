"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";

export async function login(formData: FormData) {
  const identificador = formData.get("identificador");
  const password = formData.get("password");
  const callbackUrl = formData.get("callbackUrl");

  try {
    await signIn("credentials", {
      identificador,
      password,
      redirectTo: typeof callbackUrl === "string" && callbackUrl ? callbackUrl : "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Casa/email o password incorrectos.";
    }
    throw error;
  }
}

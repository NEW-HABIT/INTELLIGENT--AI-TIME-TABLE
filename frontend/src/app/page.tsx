import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function HomePage() {
  const cookieStore = cookies();
  const token = cookieStore.get("access_token");
  const role = cookieStore.get("user_role")?.value;

  if (!token) {
    redirect("/login");
  }

  if (role === "ADMIN") redirect("/admin/dashboard");
  if (role === "FACULTY") redirect("/faculty/dashboard");
  if (role === "STUDENT") redirect("/student/dashboard");

  redirect("/login");
}

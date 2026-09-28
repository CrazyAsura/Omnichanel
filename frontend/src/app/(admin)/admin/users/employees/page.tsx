import { redirect } from "next/navigation";

export default function EmployeesRedirect() {
  redirect("/admin/users");
}

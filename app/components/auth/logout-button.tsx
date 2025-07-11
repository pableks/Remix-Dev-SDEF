import { Form } from "@remix-run/react";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <Form method="POST">
      <Button 
        type="submit" 
        variant="outline" 
        size="sm"
        className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300 dark:hover:border-red-700 transition-all duration-200"
      >
        <LogOut className="h-4 w-4" />
        Cerrar Sesión
      </Button>
    </Form>
  );
} 
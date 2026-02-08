import { RouterProvider } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { router } from "@app/routes/router";
import ChatWidget from "../components/ChatWidget/ChatWidget";

export function App() {
  const auth = useAuth();

  return (
    <>
      <RouterProvider router={router} />
      {auth.isAuthenticated && <ChatWidget />}
    </>
  );
}

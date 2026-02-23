import { RouterProvider } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { router } from "@app/routes/router";
import ChatWidget from "../components/ChatWidget/ChatWidget";

/**
 * SkipLink component for keyboard navigation (WCAG 2.0 AA requirement)
 * Allows users to bypass navigation and jump directly to main content
 */
function SkipLink() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a href="#main-content" className="skip-link" onClick={handleClick}>
      Skip to main content
    </a>
  );
}

export function App() {
  const auth = useAuth();

  return (
    <>
      {/* WCAG 2.0 AA: Skip link for keyboard users to bypass navigation */}
      <SkipLink />
      <RouterProvider router={router} />
      {auth.isAuthenticated && <ChatWidget />}
    </>
  );
}

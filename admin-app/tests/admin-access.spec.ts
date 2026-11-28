import { expect, test, type Page } from "@playwright/test";
import { e2eCredentials, logIn } from "./e2e-login";

const admin = e2eCredentials("ADMIN");
const customer = e2eCredentials("USER");

const adminRoutes = [
  { path: "/admin", heading: /^Welcome back,/ },
  { path: "/admin/products", heading: "Products & stock" },
  { path: "/admin/inventory", heading: "Inventory valuation" },
  { path: "/admin/orders", heading: "Orders" },
  { path: "/admin/orders/new", heading: "New walk-in sale" },
  { path: "/admin/reports", heading: "Sales report" },
  { path: "/admin/branches", heading: "Branches" },
  { path: "/admin/delivery-zones", heading: "Delivery zones" },
  { path: "/admin/appointments", heading: "Service appointments" },
  {
    path: "/admin/my-tasks",
    destination: "/admin/appointments",
    heading: "Service appointments",
  },
  { path: "/admin/chats", heading: "Chats" },
  { path: "/admin/notifications", heading: "Notifications" },
  { path: "/admin/crm", heading: "Customer CRM" },
  { path: "/admin/crm/follow-ups", heading: "Follow-ups" },
  { path: "/admin/customer-releases", heading: "Customer Releases" },
  { path: "/admin/users", heading: "Users" },
  { path: "/admin/roles", heading: "Roles" },
  { path: "/admin/roles/new", heading: "New role" },
  { path: "/admin/audit-logs", heading: "Audit Logs" },
  { path: "/admin/profile", heading: "Profile" },
  { path: "/admin/settings", heading: "Settings" },
  { path: "/admin/help", heading: "Staff Guide" },
] as const;

const sweepTimeout = 180_000;

async function expectRendered(
  page: Page,
  path: string,
  heading?: string | RegExp,
  destination = path,
) {
  const response = await page.goto(path);
  expect(response, `${path} should return a navigation response`).not.toBeNull();
  expect(response!.status(), `${path} HTTP status`).toBeLessThan(400);
  await expect(page).toHaveURL((url) => url.pathname === destination && !url.search);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1, name: heading, exact: true }).first())
    .toBeVisible();
  await expect(main.locator('[aria-busy="true"]:visible, [aria-label^="Loading "]:visible'))
    .toHaveCount(0, { timeout: 15_000 });
  await expect(main.getByRole("heading", { name: "Could not load this admin page" }))
    .toHaveCount(0);
}

test("full-access admin can render every static admin route in order", async ({ page }) => {
  test.skip(!admin, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.");
  if (!admin) return;
  test.setTimeout(sweepTimeout);

  await logIn(page, admin);
  const pageErrors: string[] = [];
  let visiting = "/admin";
  page.on("pageerror", (error) => pageErrors.push(`${visiting}: ${error.message}`));
  const detailPages: { path: string; heading?: string }[] = [];

  for (const route of adminRoutes) {
    await test.step(route.path, async () => {
      visiting = route.path;
      const destination = "destination" in route ? route.destination : route.path;
      await expectRendered(page, route.path, route.heading, destination);
      expect(pageErrors, "Uncaught browser errors").toEqual([]);

      if (route.path === "/admin/help") {
        await expect(page.getByRole("link", { name: "Staff Guide" }).filter({ visible: true }))
          .toHaveAttribute("href", "/admin/help");
        const main = page.getByRole("main");
        await main.getByRole("searchbox", { name: "Search help guides" }).fill("serial motor number");
        await expect(main.getByText("Receive or transfer stock", { exact: true })).toBeVisible();
        await expect(main.getByText("Reply to a customer chat", { exact: true })).toHaveCount(0);
        expect(pageErrors, "Uncaught browser errors after filtering").toEqual([]);
      }

      if (route.path === "/admin/roles" || route.path === "/admin/audit-logs") {
        const main = page.getByRole("main");
        const links = main.locator(`a[href^="${route.path}/"]:not([href="/admin/roles/new"])`);
        const visible = links.filter({ visible: true }).first();
        if (await visible.isVisible()) {
          const path = await visible.getAttribute("href");
          if (path) {
            detailPages.push({ path, heading: route.path === "/admin/audit-logs" ? "Audit entry" : undefined });
          }
        }
      }
    });
  }

  for (const detail of detailPages) {
    await test.step(detail.path, async () => {
      visiting = detail.path;
      await expectRendered(page, detail.path, detail.heading);
      expect(pageErrors, "Uncaught browser errors").toEqual([]);
    });
  }
});

test("signed-out visitors are redirected from every static admin route", async ({ page }) => {
  test.setTimeout(sweepTimeout);

  for (const { path } of adminRoutes) {
    await test.step(path, async () => {
      await page.goto(path);
      await expect(page).toHaveURL((url) => url.pathname === "/login");
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    });
  }
});

test("regular customers are denied every static admin route", async ({ page }) => {
  test.skip(!customer, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.");
  if (!customer) return;
  test.setTimeout(sweepTimeout);

  await logIn(page, customer);
  for (const { path } of adminRoutes) {
    await test.step(path, async () => {
      await page.goto(path);
      await expect(page).toHaveURL((url) =>
        url.pathname === "/" &&
        url.searchParams.get("error") === "insufficient_permissions"
      );
    });
  }
});

test("admin filters reuse the current route and keep controls visible", async ({ page }) => {
  test.skip(!admin, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.");
  if (!admin) return;
  test.setTimeout(90_000);
  await logIn(page, admin);

  const routeRequests: string[] = [];
  const main = page.getByRole("main");
  let observedPath = "";
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (request.method() === "GET" && url.pathname === observedPath && (request.isNavigationRequest() || request.headers().rsc === "1")) {
      routeRequests.push(url.pathname + url.search);
    }
  });

  await page.goto("/admin");
  const branch = main.getByRole("combobox", { name: "Branch" });
  await expect(branch).toBeEnabled();
  await branch.click();
  const branchChoices = page.getByRole("option");
  if (await branchChoices.count() > 1) {
    observedPath = "/admin";
    await branchChoices.nth(1).click();
    await expect(page).toHaveURL((url) => Boolean(url.searchParams.get("branch")));
    await expect(main.getByRole("heading", { name: /^Welcome back,/ })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL((url) => url.pathname === "/admin" && !url.search);
  } else {
    await page.keyboard.press("Escape");
  }

  observedPath = "";
  await page.goto("/admin/orders");
  const orderViews = main.getByRole("group", { name: "Order views" });
  await expect(orderViews.getByRole("button", { name: "History", exact: true })).toBeVisible();
  observedPath = "/admin/orders";
  await orderViews.getByRole("button", { name: "History", exact: true }).click();
  await expect(page).toHaveURL((url) => url.searchParams.get("view") === "history");
  await expect(orderViews.getByRole("button", { name: "History", exact: true })).toHaveAttribute("aria-pressed", "true");

  observedPath = "";
  await page.goto("/admin/chats");
  await expect(main.getByRole("heading", { name: "Chats", exact: true })).toBeVisible();
  observedPath = "/admin/chats";
  for (const tab of ["Resolved", "All", "Open"]) {
    const button = main.getByRole("button", { name: new RegExp("^" + tab + "$", "i") });
    await button.click({ timeout: 10_000 });
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  expect(routeRequests).toEqual([]);
});

test("admin realtime routes can remount during sidebar navigation", async ({ page }) => {
  test.skip(!admin, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.");
  if (!admin) return;
  test.setTimeout(90_000);
  const realtimeErrors: string[] = [];
  const recordError = (message: string) => {
    if (/cannot add.*postgres_changes.*after.*subscribe/i.test(message)) realtimeErrors.push(message);
  };
  page.on("pageerror", (error) => recordError(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") recordError(message.text());
  });
  await logIn(page, admin);
  await page.goto("/admin");

  const sidebar = page.getByRole("complementary", { name: "Sidebar navigation" });
  for (const path of ["/admin/products", "/admin/orders", "/admin/products", "/admin/appointments", "/admin/chats", "/admin", "/admin/products"]) {
    const route = adminRoutes.find((entry) => entry.path === path);
    await sidebar.locator('a[href="' + path + '"]').click();
    await expect(page).toHaveURL((url) => url.pathname === path);
    await expect(page.getByRole("main").getByRole("heading", { level: 1, name: route?.heading, exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("heading", { name: "Could not load this admin page" })).toHaveCount(0);
  }
  expect(realtimeErrors).toEqual([]);
});

// Test data only, never enabled in production.
import { claimToken, createPoll as createPollRecord, createSociety, createToken, clearAppData, createIssue, getDishes, logAudit, placeOrder, saveAnnouncement, saveDishes, setDevSuperAdminAuth, updateOrderStatus, updateSeller, updateUserStatus, votePoll, banSeller } from "../api/store.js";
import { login, register } from "../api/auth.js";
import { enterSandboxMode } from "../api/storage.js";

export const TEST_PASSWORD = "Test@1234";
export const SUPER_ADMIN_PASSWORD = "TestAdmin@123";
const APP_ADMIN = {
  id: "builtin-superadmin",
  name: "App Admin",
  email: "super@kitchennextdoor.app",
  role: "superadmin",
};

function createAccount(values) {
  return register({ password: TEST_PASSWORD, ...values });
}

function addPollVotes(poll, voters) {
  voters.forEach((buyer, index) => {
    const option = poll.options[index % poll.options.length];
    votePoll(poll.id, buyer.id, option.id);
  });
}

export function resetTestData() {
  if (!import.meta.env.DEV) throw new Error("Development data tools are not available in production.");
  enterSandboxMode();
  clearAppData();
  return { cleared: true };
}

export function seedTestData() {
  if (!import.meta.env.DEV) throw new Error("Development data tools are not available in production.");
  enterSandboxMode();
  clearAppData();
  setDevSuperAdminAuth(SUPER_ADMIN_PASSWORD);

  const society = createSociety({
    name: "Test Heights",
    city: "Bengaluru",
    expectedFlats: 15,
    commissionRate: 5,
    commissionMin: 5,
  });
  logAudit({
    actor: APP_ADMIN,
    action: "society.created",
    targetType: "society",
    targetId: society.id,
    details: `${society.name} created for local testing.`,
  });

  const token = createToken(society.id, APP_ADMIN);
  const admin = claimToken(token.code, {
    name: "Test Admin",
    email: "admin@test.com",
    mobile: "+91 90000 00010",
    password: TEST_PASSWORD,
  }, APP_ADMIN);
  login({ identifier: admin.email, password: TEST_PASSWORD, expectedRole: "admin" });

  const verifiedChef = createAccount({
    name: "Meera Test",
    email: "chef@test.com",
    mobile: "+91 90000 00020",
    role: "seller",
    societyId: society.id,
    tower: "B",
    flat: "B-402",
    kitchenName: "Meera's Test Kitchen",
    speciality: "Home-cooked favourites",
    upiId: "meera@testupi",
    referralCode: society.referralCode,
  });
  const pendingChef = createAccount({
    name: "Pending Chef",
    email: "pending.chef@test.com",
    mobile: "+91 90000 00021",
    role: "seller",
    societyId: society.id,
    tower: "A",
    flat: "A-203",
    kitchenName: "Pending Test Kitchen",
    speciality: "Test cooking",
    upiId: "pending@testupi",
  });
  const bannedChef = createAccount({
    name: "Banned Chef",
    email: "banned.chef@test.com",
    mobile: "+91 90000 00022",
    role: "seller",
    societyId: society.id,
    tower: "C",
    flat: "C-108",
    kitchenName: "Banned Test Kitchen",
    speciality: "Test cooking",
    upiId: "banned@testupi",
  });

  const approvedBuyer = createAccount({
    name: "Rohan Test",
    email: "buyer@test.com",
    mobile: "+91 90000 00030",
    role: "buyer",
    societyId: society.id,
    tower: "A",
    flat: "A-104",
  });
  const pendingBuyer = createAccount({
    name: "Pooja Test",
    email: "pending.buyer@test.com",
    mobile: "+91 90000 00031",
    role: "buyer",
    societyId: society.id,
    tower: "C",
    flat: "C-302",
  });
  const blockedBuyer = createAccount({
    name: "Blocked Buyer",
    email: "blocked.buyer@test.com",
    mobile: "+91 90000 00032",
    role: "buyer",
    societyId: society.id,
    tower: "D",
    flat: "D-111",
  });

  updateUserStatus(approvedBuyer.id, society.id, "approved", {}, admin);
  updateUserStatus(blockedBuyer.id, society.id, "rejected", {}, admin);

  const dishes = [
    {
      id: crypto.randomUUID(),
      sellerId: verifiedChef.id,
      societyId: society.id,
      name: "Dal Rice Tiffin",
      description: "A comforting test lunch.",
      category: "Tiffins",
      veg: true,
      price: 120,
      prepMins: 25,
      stock: 10,
      available: true,
      options: [
        {
          name: "Spice level",
          choices: [
            { label: "Mild", price: 0 },
            { label: "Medium", price: 0 },
            { label: "Spicy", price: 0 },
          ],
        },
        {
          name: "Extras",
          choices: [
            { label: "None", price: 0 },
            { label: "Extra ghee", price: 15 },
          ],
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      sellerId: verifiedChef.id,
      societyId: society.id,
      name: "Veg Samosa (2 pcs)",
      description: "Two crisp test samosas.",
      category: "Snacks",
      veg: true,
      price: 60,
      prepMins: 15,
      stock: 4,
      available: true,
      options: [],
    },
    {
      id: crypto.randomUUID(),
      sellerId: verifiedChef.id,
      societyId: society.id,
      name: "Mutton Biryani",
      description: "A low-stock test special.",
      category: "Specials",
      veg: false,
      price: 350,
      prepMins: 20,
      stock: 2,
      available: true,
      options: [],
    },
  ];
  saveDishes([...getDishes(), ...dishes]);
  updateSeller(verifiedChef.id, { online: true });
  banSeller(bannedChef.id, society.id, "Seeded example: account is banned for testing.", admin);

  const chefPoll = createPollRecord({
    question: "Which test special should I cook next?",
    tag: "Next Dish",
    options: [{ label: "Paneer curry" }, { label: "Lemon rice" }, { label: "Poori masala" }],
    authorId: verifiedChef.id,
    societyId: society.id,
    authorRole: "seller",
    authorLabel: verifiedChef.kitchenName,
  });
  const adminPoll = createPollRecord({
    question: "Which community tasting should we host?",
    tag: "Community",
    options: [{ label: "Breakfast" }, { label: "Snack hour" }, { label: "Dinner" }],
    authorId: admin.id,
    societyId: society.id,
    authorRole: "admin",
    authorLabel: "Society Admin",
  });
  addPollVotes(chefPoll, [approvedBuyer, pendingBuyer]);
  addPollVotes(adminPoll, [approvedBuyer, pendingBuyer]);
  saveAnnouncement(society.id, "Welcome to Test Heights! Explore the test kitchen menu.");

  const deliveredOrder = placeOrder({
    sellerId: verifiedChef.id,
    societyId: society.id,
    buyerId: approvedBuyer.id,
    buyerName: approvedBuyer.name,
    buyerFlat: "Tower A · A-104",
    buyerPhone: approvedBuyer.mobile,
    items: [{
      dishId: dishes[0].id,
      name: dishes[0].name,
      unit: 120,
      qty: 1,
      options: [{ name: "Spice level", choice: "Mild", price: 0 }, { name: "Extras", choice: "None", price: 0 }],
      note: "",
    }],
    total: 120,
    deliveryMode: "Doorstep",
    paymentMode: "Cash on Handover",
    upiRef: "",
    status: "Placed",
    note: "Seeded delivered-order example.",
  });
  updateOrderStatus(deliveredOrder.id, "Preparing");
  updateOrderStatus(deliveredOrder.id, "Ready");
  updateOrderStatus(deliveredOrder.id, "Delivered");

  const placedOrder = placeOrder({
    sellerId: verifiedChef.id,
    societyId: society.id,
    buyerId: approvedBuyer.id,
    buyerName: approvedBuyer.name,
    buyerFlat: "Tower A · A-104",
    buyerPhone: approvedBuyer.mobile,
    items: [{
      dishId: dishes[1].id,
      name: dishes[1].name,
      unit: 60,
      qty: 1,
      options: [],
      note: "",
    }],
    total: 60,
    deliveryMode: "Pickup",
    paymentMode: "Cash on Handover",
    upiRef: "",
    status: "Placed",
    note: "Seeded placed-order example.",
  });

  const issue = createIssue({
    societyId: society.id,
    orderId: deliveredOrder.id,
    raisedBy: approvedBuyer.id,
    raisedByName: approvedBuyer.name,
    category: "Food quality",
    description: "Seeded open issue for testing the Society Admin workflow.",
  });

  const accounts = [
    { role: "App Admin", name: "App Admin", email: "super@kitchennextdoor.app", status: "ready" },
    { role: "Society Admin", name: admin.name, email: admin.email, status: "approved" },
    { role: "Chef", name: verifiedChef.name, email: verifiedChef.email, status: verifiedChef.status },
    { role: "Chef", name: pendingChef.name, email: pendingChef.email, status: pendingChef.status },
    { role: "Chef", name: bannedChef.name, email: bannedChef.email, status: "banned" },
    { role: "Buyer", name: approvedBuyer.name, email: approvedBuyer.email, status: "approved" },
    { role: "Buyer", name: pendingBuyer.name, email: pendingBuyer.email, status: pendingBuyer.status },
    { role: "Buyer", name: blockedBuyer.name, email: blockedBuyer.email, status: "rejected" },
  ];

  return {
    society: { id: society.id, name: society.name, referralCode: society.referralCode },
    accounts,
    summary: {
      societies: 1,
      registeredAccounts: 7,
      dishes: dishes.length,
      polls: 2,
      orders: 2,
      deliveredOrders: 1,
      placedOrders: 1,
      issues: 1,
      deliveredOrderId: deliveredOrder.id,
      placedOrderId: placedOrder.id,
      issueId: issue.id,
    },
  };
}

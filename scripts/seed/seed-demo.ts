import { mastra } from "../../src/mastra/index.js";

console.log("👶 WIC Application Assistant\n");
console.log(
  "This example shows a practical application of Mastra's memory system for WIC applications.\n",
);

const agent = mastra.getAgent("webAutomationAgent");
const threadId = "demo-thread-" + Date.now();
const resourceId = "webAutomationAgent";

// Initial conversation
console.log("=== WIC Application Session ===");
console.log(
  "User: Hi, I need help applying for WIC. I'm a young mother with a 2-year-old child.",
);

const response1 = await agent.generate(
  [
    {
      role: "user",
      content:
        "Hi, I need help applying for WIC. I'm a young mother with a 2-year-old child.",
    },
  ],
  {
    threadId,
    resourceId,
  },
);
console.log("WIC Assistant:", response1.text);

console.log(
  "\nUser: My name is Sarah Johnson, I'm 24 years old and I live in Riverside, CA. I was born on May 12th.",
);
const response2 = await agent.generate(
  [
    {
      role: "user",
      content:
        "My name is Sarah Johnson, I'm 24 years old, and I live in Riverside, CA. I was born on May 12th.",
    },
  ],
  {
    threadId,
    resourceId,
  },
);
console.log("WIC Assistant:", response2.text);

console.log(
  "\nUser: My address is 456 Oak Street, Riverside, CA 92503. My phone number is (951) 555-0789. My email is sarah.johnson@email.com",
);
const response3 = await agent.generate(
  [
    {
      role: "user",
      content:
        "My address is 456 Oak Street, Riverside, CA 92503. My phone number is (951) 555-0789. My email is sarah.johnson@email.com",
    },
  ],
  {
    threadId,
    resourceId,
  },
);
console.log("WIC Assistant:", response3.text);

console.log(
  "\nUser: My daughter's name is Emma Johnson, and she was born on March 15, 2022. I do not have MediCal.",
);
const response4 = await agent.generate(
  [
    {
      role: "user",
      content:
        "My daughter's name is Emma Johnson and she was born on March 15, 2022. I do not have MediCal.",
    },
  ],
  {
    threadId,
    resourceId,
  },
);
console.log("WIC Assistant:", response4.text);

console.log("\nUser: What documents do I need for the WIC application?");
const response5 = await agent.generate(
  [{ role: "user", content: "What documents do I need for the WIC application?" }],
  {
    threadId,
    resourceId,
  },
);
console.log("WIC Assistant:", response5.text);

console.log(
  "\nUser: My monthly income is $2,500 and I work part-time at a grocery store.",
);
const response6 = await agent.generate(
  [
    {
      role: "user",
      content:
        "My monthly income is $2,500 and I work part-time at a grocery store.",
    },
  ],
  {
    threadId,
    resourceId
  },
);
console.log("WIC Assistant:", response6.text);

console.log(
  "\nUser: Can I do the application online or do I need to go to an office? I would prefer in office.",
);
const response7 = await agent.generate(
  [
    {
      role: "user",
      content:
        "Can I do the application online or do I need to go to an office? I would prefer in office.",
    },
  ],
  {
    threadId,
    resourceId
  },
);
console.log("WIC Assistant:", response7.text);

console.log(
  "\nUser: How long does it take for them to approve my WIC application?",
);
const response8 = await agent.generate(
  [
    {
      role: "user",
      content:
        "How long does it take for them to approve my WIC application?",
    },
  ],
  {
    threadId,
    resourceId
  },
);
console.log("WIC Assistant:", response8.text);

// Test comprehensive memory
console.log("\n\n=== Testing Memory Recall ===");
console.log(
  "User: Can you remind me of all the information you've helped me provide for my WIC application?",
);

const memoryTest = await agent.generate(
  [
    {
      role: "user",
      content:
        "Can you remind me of all the information you've helped me provide for my WIC application?",
    },
  ],
  {
    threadId,
    resourceId
  },
);
console.log("WIC Assistant:", memoryTest.text);

console.log("\n\n✅ WIC Application Assistant demonstration complete!");
console.log("\nKey features demonstrated:");
console.log("- Persistent applicant information tracking");
console.log("- Child information management");
console.log("- Address and contact information storage");
console.log("- Financial eligibility assessment");
console.log("- Building a relationship through multiple interactions");
console.log("- Application process guidance");

import { MongoClient, Document } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next"; // Import types

// MongoDB Configuration
const MONGO_URI = process.env.MONGODB_URI || "your-mongo-connection-string";
const DATABASE_NAME = "RawLeads";
const COLLECTION_NAME = "RawLeads";

// Hardcoded Keywords (Positive and Negative)
const positiveKeywords = ["food", "junks", "pizza", "meal", "eat"];
const negativeKeywords = [
  "onlyfans",
  "18+",
  "adult",
  "nude",
  "sex",
  "porn",
  "sexual",
  "exclusive content",
  "erotica",
  "XXX",
  "fetish",
  "BDSM",
  "camgirl",
  "webcam",
  "erotic",
  "sexy",
  "intimate",
];

const negativeKeywordsRegex = new RegExp(negativeKeywords.join("|"), "i");
const positiveKeywordsRegex = new RegExp(positiveKeywords.join("|"), "i");

// Define the type for each document in the results
interface Result {
  name: string;
  desc: string;
  email: string;
  phone: string;
  login: string;
  post_cnt: number;
  fol_cnt: number;
  link: string;
}

// Define the type for filters
interface Filters {
  minFollowers: number;
  maxFollowers: number;
  minPosts: number;
}

// Reuse MongoDB Connection (Prevents Cold Starts)
let cachedClient: MongoClient | null = null; // Allow null initially

async function getMongoClient() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URI);
    await cachedClient.connect();
  }
  return cachedClient;
}

// Next.js API Route Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) { 
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { filters } = req.query;

  // Default filters if not passed
  const defaultFilters: Filters = { minFollowers: 0, maxFollowers: 40000, minPosts: 5 };

  // Check if the filters are empty and assign default values
  const appliedFilters: Filters = filters ? JSON.parse(filters as string) : defaultFilters;
  const { minFollowers, maxFollowers, minPosts } = appliedFilters;

  // Log the received filters
  console.log("Received filters:", appliedFilters);

  // MongoDB Client
  try {
    const client = await getMongoClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Log pipeline creation
    console.log("Creating aggregation pipeline...");
    const pipeline = getMongoPipeline(appliedFilters);
    console.log("Pipeline:", JSON.stringify(pipeline, null, 2));

    const cursor = collection.aggregate(pipeline);

    const results: Result[] = []; // Explicitly type results
    let count = 0;
    await cursor.forEach((doc: Document) => { // Explicitly type doc as Document
      if (!isFilteredOut(doc)) {
        // Cast doc to Result type
        results.push(doc as Result);
        count++;
      }
    });

    // Log the results count
    console.log(`Found ${count} documents after filtering`);

    return res.status(200).json(results);

  } catch (error) {
    console.error("Error executing query:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// MongoDB `$search` Pipeline (Filters in MongoDB)
function getMongoPipeline(filters: Filters) {
  console.log("Building MongoDB aggregation pipeline with filters:", filters);
  return [
    {
      $search: {
        index: "default",
        compound: {
          should: positiveKeywords.map((word) => ({
            text: { query: word, path: ["desc", "login", "name"] },
          })),
          mustNot: negativeKeywords.map((word) => ({
            text: { query: word, path: ["desc", "login", "name"] },
          })),
        },
      },
    },
    {
      $match: {
        avatar: { $ne: "0" },
        desc: { $ne: "0" },
        privacy: { $ne: "private" },
        userEmail: { $nin: ["dara.omotola@yahoo.com"] },
        fol_cnt: { $gte: filters.minFollowers, $lte: filters.maxFollowers },
        post_cnt: { $gte: filters.minPosts },
      },
    },
    { $limit: 20 }, // Limit to the first 20 documents
    { $project: getProjectionFields() }, // Project only required fields
  ];
}

// 🔎 Fields to Retrieve (Only include necessary fields)
function getProjectionFields() {
  return {
    name: 1,
    desc: 1,
    email: 1,
    phone: 1,
    login: 1,
    post_cnt: 1,
    fol_cnt: 1,
    link: 1,
  };
}

// ❌ Node.js Filtering (Used if MongoDB `$search` is disabled)
function isFilteredOut(doc: Document) {
  const fieldsToCheck = [doc.desc, doc.login, doc.name];

  // Exclude if any field matches a negative keyword
  if (fieldsToCheck.some((field) => negativeKeywordsRegex.test(field))) {
    return true;
  }

  // Include only if at least one field matches a positive keyword
  if (!fieldsToCheck.some((field) => positiveKeywordsRegex.test(field))) {
    return true; // Filter out if no positive keyword found
  }

  return false; // Passed filtering
}

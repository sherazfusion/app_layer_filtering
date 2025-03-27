import { MongoClient, Document } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

// MongoDB Configuration
const MONGO_URI = "mongodb+srv://sheraz:dnx97sa@cluster0leadsdatabase.kdcntdq.mongodb.net/";
const DATABASE_NAME = "RawLeads";
const COLLECTION_NAME = "RawLeads";

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
  minFollowers: number | undefined;
  maxFollowers: number | undefined;
  minPosts: number | undefined;
  positiveKeywords: string[]; // Now accepting positive keywords as an array
  negativeKeywords: string[]; // Now accepting negative keywords as an array
  includeProfilePicture: boolean;
  includeBio: boolean;
  email: string;
  excludeSexualContent: boolean;
  includePrivateAccounts: boolean;
  excludeExportedLeads: boolean;
  includeWebsiteLink: boolean;
  filterInMongo: boolean; // New flag to check if MongoDB filtering should be used
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
  const defaultFilters: Filters = {
    minFollowers: undefined, // Use undefined instead of 0 for conditional filtering
    maxFollowers: undefined, // Use undefined instead of 40000 for conditional filtering
    minPosts: undefined, // Use undefined instead of 5 for conditional filtering
    positiveKeywords: [],
    negativeKeywords: [],
    includeProfilePicture: false,
    includeBio: false,
    email: "",
    excludeSexualContent: false,
    includePrivateAccounts: false,
    excludeExportedLeads: false,
    includeWebsiteLink: false,
    filterInMongo: false, // Default to false to use Node.js filtering
  };

  // Check if the filters are empty and assign default values
  const appliedFilters: Filters = filters ? JSON.parse(filters as string) : defaultFilters;
  const {
    minFollowers, maxFollowers, minPosts, 
    positiveKeywords, negativeKeywords,
    includeProfilePicture, includeBio, email,
    excludeSexualContent, includePrivateAccounts,
    excludeExportedLeads, includeWebsiteLink, filterInMongo
  } = appliedFilters;

  // Log the received filters
  console.log("Received filters:", appliedFilters);

  // Handle optional negativeKeywords and add predefined negative keywords if excludeSexualContent is true
  let updatedNegativeKeywords = negativeKeywords ? [...negativeKeywords] : [];
  
  if (excludeSexualContent) {
    // List of sexual content-related keywords
    const sexualKeywords = [
     "onlyfans", "18+", "adult", "nude", "sex", "porn", "sexual", "exclusive content", "penis", "vagina",
    "erotica", "XXX", "fetish", "BDSM", "camgirl", "webcam", "erotic", "sexy", "intimate", "pornography",
    "striptease", "adult content", "explicit", "lust", "orgasm", "masturbation", "erotic videos", "nude photos",
    "sex tapes", "amateur porn", "professional porn", "kink", "adult entertainment", "sex chat", "sexual videos",
    "sexual photos", "pornographic", "sexy pictures", "sex stories", "porn stars", "sex workers", "escort",
    "dirty talk", "seductive", "sensual", "adult film", "lewd", "provocative", "smut", "bare", "naked",
    "intimate moments", "dirty pictures", "sex acts"
    ];
    updatedNegativeKeywords = [...updatedNegativeKeywords, ...sexualKeywords];
  }

  // MongoDB Client
  try {
    const client = await getMongoClient();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Log pipeline creation
    console.log("Creating aggregation pipeline...");
    const pipeline = getMongoPipeline(
      positiveKeywords, updatedNegativeKeywords, appliedFilters, filterInMongo
    );
    console.log("Pipeline:", JSON.stringify(pipeline, null, 2));

    const cursor = collection.aggregate(pipeline);

    const results: Result[] = []; // Explicitly type results
    let count = 0;
    let phoneCount = 0; // Count for documents with valid phone
    let emailCount = 0; // Count for documents with valid email

    await cursor.forEach((doc: Document) => { // Explicitly type doc as Document
      if (!isFilteredOut(doc, updatedNegativeKeywords, positiveKeywords, filterInMongo)) {
        // Cast doc to Result type
        results.push(doc as Result);
        count++;

        // Check if phone is valid (not equal to "0")
        if (doc.phone !== "0") {
          phoneCount++;
        }

        // Check if email is valid (not equal to "0")
        if (doc.email !== "0") {
          emailCount++;
        }
      }
    });

    // Log the results count
    console.log(`Found ${count} documents after filtering`);
    console.log(`Documents with valid phone: ${phoneCount}`);
    console.log(`Documents with valid email: ${emailCount}`);

    // Return the results along with the counts for valid phone and email
    return res.status(200).json({ results, phoneCount, emailCount });

  } catch (error) {
    console.error("Error executing query:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// MongoDB `$search` Pipeline (Filters in MongoDB)
function getMongoPipeline(positiveKeywords: string[], negativeKeywords: string[], filters: Filters, filterInMongo: boolean) {
  console.log("Building MongoDB aggregation pipeline with filters:", filters);

  const matchStage: any = {
    avatar: { $ne: "0" },
    desc: { $ne: "0" },
    privacy: { $ne: "private" },
    userEmail: { $nin: [filters.email] }, // Exclude the email passed from frontend
  };

  // Conditionally add the filters if they are provided
  if (filters.minFollowers !== undefined) {
    matchStage.fol_cnt = { $gte: filters.minFollowers };
  }
  if (filters.maxFollowers !== undefined) {
    matchStage.fol_cnt = { ...matchStage.fol_cnt, $lte: filters.maxFollowers };
  }
  if (filters.minPosts !== undefined) {
    matchStage.post_cnt = { $gte: filters.minPosts };
  }

  // Conditionally add the check for profile picture if the filter is true
  if (filters.includeProfilePicture) {
    matchStage.avatar = { $ne: "0" }; // Exclude documents where avatar is "0"
  }

  // Conditionally add the check for bio if the filter is true
  if (filters.includeBio) {
    matchStage.desc = { $ne: "0" }; // Exclude documents where desc is "0"
  }

  // Conditionally add the check for website link if the filter is true
  if (filters.includeWebsiteLink) {
    matchStage.link = { $ne: "0" }; // Exclude documents where link is "0"
  }

  // Conditionally add the check for private accounts if the filter is false
  if (filters.includePrivateAccounts === false) {
    matchStage.privacy = { $ne: "private" }; // Exclude private accounts
  }

  // Conditionally add the check for excluding exported leads if the filter is true
  if (filters.excludeExportedLeads && filters.email) {
    matchStage.userEmail = { $nin: [filters.email] }; // Exclude leads with matching userEmail
  }

  let pipeline = [
    {
      $match: matchStage,
    },
    // Dynamically set the limit based on filterInMongo value
    { $limit: filterInMongo ? 30000 : 50000 },
    { $project: getProjectionFields() }, // Project only required fields
  ];

  if (filterInMongo) {
    console.log("🔍 Using MongoDB Atlas Search Filtering...");
    pipeline = [
      {
        // @ts-ignore
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
      ...pipeline, // Append the match, limit, and projection stages to the pipeline
    ];
  } else {
    console.log("💻 Using Application-Level Filtering");
  }

  return pipeline;
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
function isFilteredOut(doc: Document, negativeKeywords: string[], positiveKeywords: string[], filterInMongo: boolean) {
  const fieldsToCheck = [doc.desc, doc.login, doc.name];

  // Exclude if any field matches a negative keyword
  const negativeKeywordsRegex = new RegExp(negativeKeywords.join("|"), "i");
  if (fieldsToCheck.some((field) => negativeKeywordsRegex.test(field))) {
    return true;
  }

  // Include only if at least one field matches a positive keyword
  const positiveKeywordsRegex = new RegExp(positiveKeywords.join("|"), "i");
  if (!fieldsToCheck.some((field) => positiveKeywordsRegex.test(field))) {
    return true; // Filter out if no positive keyword found
  }

  return false; // Passed filtering
}

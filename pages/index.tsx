import { useState } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [minimumFollowers, setMinimumFollowers] = useState<number | "">("");
  const [maximumFollowers, setMaximumFollowers] = useState<number | "">("");
  const [minimumPosts, setMinimumPosts] = useState<number | "">("");
  const [positiveKeywords, setPositiveKeywords] = useState<string>(""); // New state for positive keywords
  const [negativeKeywords, setNegativeKeywords] = useState<string>(""); // New state for negative keywords
  const [includeProfilePicture, setIncludeProfilePicture] = useState<boolean>(false); // Toggle for Profile Picture (avatar)
  const [includeBio, setIncludeBio] = useState<boolean>(false); // Toggle for Bio (desc)
  const [email, setEmail] = useState<string>(""); // New state for email field
  const [excludeSexualContent, setExcludeSexualContent] = useState<boolean>(false); // Toggle to exclude sexual content
  const [includePrivateAccounts, setIncludePrivateAccounts] = useState<boolean>(false); // Toggle to include private accounts
  const [excludeExportedLeads, setExcludeExportedLeads] = useState<boolean>(false); // Toggle to exclude exported leads
  const [includeWebsiteLink, setIncludeWebsiteLink] = useState<boolean>(false); // Toggle for Website Link
  const [message, setMessage] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);

  const handleSubmit = async () => {
    setMessage(""); // Reset message
    const filters: any = {
      positiveKeywords: positiveKeywords.split(",").map((kw) => kw.trim()), // Convert to array
      negativeKeywords: negativeKeywords.split(",").map((kw) => kw.trim()), // Convert to array
      includeProfilePicture,
      includeBio,
      email,
      excludeSexualContent,
      includePrivateAccounts,
      excludeExportedLeads,
      includeWebsiteLink,
    };

    // Conditionally add filters if they have values
    if (minimumFollowers) filters.minFollowers = Number(minimumFollowers);
    if (maximumFollowers) filters.maxFollowers = Number(maximumFollowers);
    if (minimumPosts) filters.minPosts = Number(minimumPosts);

    try {
      console.log("Sending request to API with filters:", filters);
      const response = await fetch(`/api/search?filters=${JSON.stringify(filters)}`);
      
      console.log("Response received:", response.status);

      if (!response.ok) {
        setMessage("Failed to fetch data.");
        return;
      }

      const data = await response.json();
      console.log("API Data:", data); // Log the data received from API
      setResults(data); // Set results from the API response
      setMessage("Data fetched successfully!");
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage("Error fetching data.");
    }
  };

  return (
    <main className={`flex min-h-screen p-24 ${inter.className}`}>
      <div className="flex w-full">
        {/* Left Section: Filters */}
        <div className="w-1/3 p-4">
          <div className="flex flex-col gap-4">
             {/* New fields for positive and negative keywords */}
             <input
              type="text"
              placeholder="Positive Keywords (comma separated)"
              value={positiveKeywords}
              onChange={(e) => setPositiveKeywords(e.target.value)}
              className="border p-2 rounded-md"
            />
            <input
              type="text"
              placeholder="Negative Keywords (comma separated)"
              value={negativeKeywords}
              onChange={(e) => setNegativeKeywords(e.target.value)}
              className="border p-2 rounded-md"
            />

            {/* New fields for Email */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border p-2 rounded-md"
            />

            {/* Toggle for Website Link */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeWebsiteLink}
                onChange={() => setIncludeWebsiteLink(!includeWebsiteLink)}
                className="h-5 w-5"
              />
              Include Website Link
            </label>

            {/* Toggle for Profile Picture */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeProfilePicture}
                onChange={() => setIncludeProfilePicture(!includeProfilePicture)}
                className="h-5 w-5"
              />
              Profile Picture (avatar)
            </label>

            {/* Toggle for Bio */}
            <label className="flex items-center gap-2 ">
              <input
                type="checkbox"
                checked={includeBio}
                onChange={() => setIncludeBio(!includeBio)}
                className="h-5 w-5"
              />
              Bio (desc)
            </label>

            {/* Toggle for Exclude Sexual Content */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={excludeSexualContent}
                onChange={() => setExcludeSexualContent(!excludeSexualContent)}
                className="h-5 w-5"
              />
              Exclude Sexual Content (avatar)
            </label>

            {/* Toggle for Include Private Accounts */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includePrivateAccounts}
                onChange={() => setIncludePrivateAccounts(!includePrivateAccounts)}
                className="h-5 w-5"
              />
              Include Private Accounts (privacy)
            </label>

            {/* Toggle for Exclude Already Exported Leads */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={excludeExportedLeads}
                onChange={() => setExcludeExportedLeads(!excludeExportedLeads)}
                className="h-5 w-5"
              />
              Exclude Already Exported Leads (userEmail)
            </label>

            <input
              type="number"
              placeholder="Minimum Followers"
              value={minimumFollowers}
              onChange={(e) => setMinimumFollowers(Number(e.target.value))}
              className="border p-2 rounded-md"
            />
            <input
              type="number"
              placeholder="Maximum Followers"
              value={maximumFollowers}
              onChange={(e) => setMaximumFollowers(Number(e.target.value))}
              className="border p-2 rounded-md"
            />
            <input
              type="number"
              placeholder="Minimum Posts"
              value={minimumPosts}
              onChange={(e) => setMinimumPosts(Number(e.target.value))}
              className="border p-2 rounded-md"
            />

            <button
              onClick={handleSubmit}
              className="bg-blue-500 text-white p-2 rounded-md"
            >
              Submit
            </button>
          </div>

          {/* Display Message */}
          {message && <p className="text-xl mt-4">{message}</p>}
        </div>

        {/* Right Section: Display Results */}
        <div className="w-2/3 p-4">
          {results.length > 0 && (
            <div>
              {/* Label displaying the number of found documents */}
              <p className="text-white mb-4 text-xl">
                Total documents found: {results.length}
              </p>

              {/* Table to display results */}
              <table className="min-w-full table-auto text-white">
                <thead>
                  <tr>
                    <th className="border px-4 py-2">Name</th>
                    <th className="border px-4 py-2">Description</th>
                    <th className="border px-4 py-2">Email</th>
                    <th className="border px-4 py-2">Phone</th>
                    <th className="border px-4 py-2">Login</th>
                    <th className="border px-4 py-2">Followers</th>
                    <th className="border px-4 py-2">Posts</th>
                    <th className="border px-4 py-2">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="bg-gray-800">
                      <td className="border px-4 py-2">{result.name}</td>
                      <td className="border px-4 py-2">{result.desc}</td>
                      <td className="border px-4 py-2">{result.email}</td>
                      <td className="border px-4 py-2">{result.phone}</td>
                      <td className="border px-4 py-2">{result.login}</td>
                      <td className="border px-4 py-2">{result.fol_cnt}</td>
                      <td className="border px-4 py-2">{result.post_cnt}</td>
                      <td className="border px-4 py-2">{result.link}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {results.length === 0 && <p className="text-white">No results found.</p>}
        </div>
      </div>
    </main>
  );
}

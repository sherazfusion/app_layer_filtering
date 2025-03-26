import { useState } from "react";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [minimumFollowers, setMinimumFollowers] = useState<number | "">("");
  const [maximumFollowers, setMaximumFollowers] = useState<number | "">("");
  const [minimumPosts, setMinimumPosts] = useState<number | "">("");
  const [message, setMessage] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);

  const handleSubmit = async () => {
    setMessage(""); // Reset message
    const filters = {
      minFollowers: minimumFollowers || 0, // Default to 0 if empty
      maxFollowers: maximumFollowers || 40000, // Default to 40000 if empty
      minPosts: minimumPosts || 5, // Default to 5 if empty
    };

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

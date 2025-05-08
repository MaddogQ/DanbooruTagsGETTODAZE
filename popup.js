document.addEventListener("DOMContentLoaded", function () {
  const imageIdInput = document.getElementById("imageId");
  const extractBtn = document.getElementById("extractBtn");
  const copyBtn = document.getElementById("copyBtn");
  const saveBtn = document.getElementById("saveBtn");
  const includeArtistCheckbox = document.getElementById("includeArtist");
  const formatOriginal = document.getElementById("formatOriginal");
  const formatSpaces = document.getElementById("formatSpaces");
  const statusDiv = document.getElementById("status");
  const resultsDiv = document.getElementById("results");

  let currentTags = {
    artist: "",
    character: "",
    origin: "",
    tags: "",
  };

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = "status " + (isError ? "error" : "success");
  }

  function processTag(tag) {
    if (formatSpaces.checked) {
      // Replace underscores with spaces and escape brackets
      return tag.replace(/_/g, " ").replace(/[()]/g, "\\$&");
    }
    return tag;
  }

  function formatTags(tags) {
    const tagArray = tags.split(/\s+/).filter((tag) => tag);
    const processedTags = tagArray.map(processTag);
    return processedTags.join(", ");
  }

  function updateResults(data) {
    document.getElementById("artist").textContent = formatTags(data.artist);
    document.getElementById("character").textContent = formatTags(
      data.character
    );
    document.getElementById("origin").textContent = formatTags(data.origin);
    document.getElementById("tags").textContent = formatTags(data.tags);
    resultsDiv.classList.remove("hidden");
  }

  function getExportString() {
    const parts = [];
    if (includeArtistCheckbox.checked && currentTags.artist) {
      parts.push(currentTags.artist);
    }
    if (currentTags.character) {
      parts.push(currentTags.character);
    }
    if (currentTags.origin) {
      parts.push(currentTags.origin);
    }
    if (currentTags.tags) {
      parts.push(currentTags.tags);
    }

    const tags = parts
      .join(" ")
      .split(/\s+/)
      .filter((tag) => tag);
    const processedTags = tags.map(processTag);

    return processedTags.join(", ");
  }

  async function extractTags(imageId) {
    if (!imageId) {
      showStatus("Please enter an image ID", true);
      return;
    }

    try {
      const response = await fetch(
        `https://danbooru.donmai.us/posts/${imageId}.json`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      currentTags = {
        artist: data.tag_string_artist,
        character: data.tag_string_character,
        origin: data.tag_string_copyright,
        tags: data.tag_string_general,
      };

      updateResults(currentTags);
      showStatus("Tags extracted successfully!");
    } catch (error) {
      showStatus(`Error: ${error.message}`, true);
    }
  }

  function copyToClipboard() {
    const prompt = getExportString();

    navigator.clipboard
      .writeText(prompt)
      .then(() => {
        showStatus("Copied to clipboard!");
      })
      .catch(() => {
        showStatus("Failed to copy to clipboard", true);
      });
  }

  function saveToFile() {
    const prompt = getExportString();
    const blob = new Blob([prompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `danbooru_tags_${imageIdInput.value}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus("File saved successfully!");
  }

  // Update display when format changes
  function handleFormatChange() {
    if (
      currentTags.artist ||
      currentTags.character ||
      currentTags.origin ||
      currentTags.tags
    ) {
      updateResults(currentTags);
    }
  }

  // Get current tab's URL and extract image ID if on Danbooru
  async function getCurrentImageId() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const url = tab.url;

      // Check if we're on a Danbooru post page
      const match = url.match(/danbooru\.donmai\.us\/posts\/(\d+)/);
      if (match) {
        const imageId = match[1];
        imageIdInput.value = imageId;
        return imageId;
      }
    } catch (error) {
      console.error("Error getting current tab:", error);
    }
    return null;
  }

  // Initialize
  async function initialize() {
    const currentImageId = await getCurrentImageId();
    if (currentImageId) {
      extractTags(currentImageId);
    }
  }

  extractBtn.addEventListener("click", () =>
    extractTags(imageIdInput.value.trim())
  );
  copyBtn.addEventListener("click", copyToClipboard);
  saveBtn.addEventListener("click", saveToFile);
  formatOriginal.addEventListener("change", handleFormatChange);
  formatSpaces.addEventListener("change", handleFormatChange);

  // Allow Enter key to trigger extraction
  imageIdInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      extractTags(imageIdInput.value.trim());
    }
  });

  // Initialize when popup opens
  initialize();
});

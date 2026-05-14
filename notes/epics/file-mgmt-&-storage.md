Let's stick to general concepts and architecture here.
I want to discuss how the app will be deployed, as I don't have a clear picture of that.
The scenario I see, is that the user might have some video files on their pc's, the app itself is a pwa, but it needs to store stuff in a vector database of some sort. How does it all work? Is the db on the users machine? And what about some sort of index of the user's source files?
And what happens when a user has purchased the app? Do they download it, or?

This is where your **Local-First** strategy gets technically interesting. To maintain your competitive advantage of total privacy and zero hosting costs, the deployment needs to turn the user's browser into a "Virtual Desktop."

Here is how the architecture and deployment work for a privacy-focused PWA.

---

### 1. The Database: Where does data live?

In a standard app, the DB is in the cloud. In your app, the database lives **inside the user's browser storage**.

* **Vector Database:** For the AI to search through old interviews, you use a library like **Orama** or **Voy**. These are WASM-based vector engines that run entirely in the browser's memory.
* **Structured Data (Relational):** For your CSV fields and project metadata, you use **IndexedDB** (via a wrapper like Dexie.js). This is the "hard drive" of the browser.
* **The Index:** The "index of source files" is simply a table in IndexedDB that stores the file metadata and a pointer to the transcription.

### 2. The File Access: How do we see local files?

A PWA cannot "crawl" a user's hard drive like a native app (for security reasons), but it can use the **File System Access API**.

* **The "Origin" Folder:** You can ask the user to select a specific folder on their PC (e.g., `/Research/Project_Alpha`).
* **Persistence:** The browser can "remember" permission for that folder. When the user re-opens the PWA, the app can see if new videos have been added to that folder and offer to process them.
* **Storage:** The app doesn't necessarily "copy" the 2GB video into the browser. It keeps a reference to the file on the hard drive and only loads it when needed.

---

### 3. The Deployment & Purchase Model

Since you are a PWA, "installation" is just a click in the browser's URL bar (the "Install App" icon).

**The Purchase Flow:**

1. **The Paywall:** The user visits your website. They can try a "Demo Mode" where data is cleared on refresh.
2. **The License:** They buy a license (Stripe/Gumroad). You provide a **License Key**.
3. **Activation:** The user enters the key in the PWA. The app validates this once against your server and then stores an "Activated" flag in the local IndexedDB.
4. **Updates:** Every time you push new code to your web server, the PWA updates in the background. The user always has the latest "Workbench" without ever downloading a `.zip` or `.exe`.

---

### 4. High-Level Architecture Diagram

1. **Frontend (Vue 3):** The UI the user interacts with.
2. **Worker Threads:** Where the "Heavy Lifting" happens.
* **Audio Worker:** Pre-processes the audio (the code we wrote).
* **Whisper Worker:** Runs the transcription (WASM/WebGPU).
* **Vector Worker:** Indexes the text into the local vector DB.


3. **Storage Layer:** IndexedDB stores the transcripts and the "Priority Index" calculations.

---

### 5. Why this is a "Blue Ocean" Deployment

Most developers find this hard because they are used to the "Server-Client" model. By doing it this way, you have:

* **Zero Server Costs:** You aren't paying for GPUs or Databases. Your only cost is hosting the static HTML/JS files (pennies).
* **Total Privacy:** If a user is a clinical psychologist, they can literally turn off their Wi-Fi and the app will still transcribe and search. That is a **massive** selling point.

### The Trade-off: Browser Limits

The only "catch" is that browsers can occasionally clear IndexedDB if the hard drive gets too full. You’ll need a "Backup to File" button that lets the user export their entire database as a single `.json` or `.zip` file for safekeeping.

**Does this "Local-First" approach align with how you want to handle user accounts, or were you hoping for some level of cloud syncing between different devices?**

"browsers can occasionally clear IndexedDB"
So the db is persisted, even when the browser is closed, but it MAY be cleared in some cases?
There would need to be a pretty robust warning system in place, to let users know when they should do a backup...not to mention a way to restore the data.

Spot on. Relying on browser storage for professional research data is a bit like parking a car in a lot where the attendant *might* tow it if they run out of space. You need a "garage" strategy to make the user feel safe.

To understand how to manage this, we have to distinguish between **Temporary** and **Persistent** storage.

### 1. The "Persistent Storage" Request

By default, browsers treat IndexedDB as "Best Effort." However, modern PWAs can explicitly ask for **Persistent Storage**.

* **The Logic:** You can call `navigator.storage.persist()`. If the user has "installed" the PWA or interacts with it frequently, the browser will grant this request.
* **The Result:** Once "Persistent" is granted, the browser **will not** clear the data unless the user manually goes into settings and deletes it.

### 2. The "State of Health" Dashboard

Instead of a scary warning that pops up when it's too late, you should build a **"Data Health"** section in your app settings.

* **Quota Estimation:** You can use `navigator.storage.estimate()` to show the user a progress bar: *"Using 1.2GB of 25GB available."*
* **Persistence Status:** A green checkmark saying: *"Storage is Persistent. Your data is safe from automatic cleanup."*
* **Automatic Reminders:** If the user hasn't exported a backup in 7 days, a subtle badge appears on the "Export" button.

---

### 3. Backup & Restore Architecture

Since you aren't using a cloud server, your "Backup" is essentially a **Snapshot** of the local database.

* **Export (.jtbd file):** You create a custom file extension (e.g., `.jtbd`). When the user clicks "Backup," the app bundles all the IndexedDB tables (transcripts, cards, project metadata) into a single JSON or SQLite file and "downloads" it to the user's Downloads folder.
* **Restore:** The user "uploads" that `.jtbd` file back into the app. The app clears the current IndexedDB and populates it with the file's data.

---

### 4. Syncing the "Index" with the Files

This is the trickiest part of your architecture. If the user moves their video files to an external drive, your app's "Index" will point to a broken link.

**The Solution: File Handles**
Using the **File System Access API**, your app stores a "File Handle" in the database.

1. The user picks a folder.
2. The app stores a reference to that folder.
3. If the user re-opens the app and the folder is missing, the app says: *"The folder 'Customer Interviews' is missing. Please locate it to view these videos."*

### 5. Why this is actually a Feature, not a Bug

For your target market (clinical psychologists, strategists), the fact that **they own the backup** is a huge selling point.

> *"Unlike Dovetail or Otter, if we go out of business, you still have your app and your data. You aren't locked into a subscription to keep your insights."*

This "Sovereign Data" model is a powerful marketing angle for researchers who have been burned by SaaS companies changing their terms of service or pricing.

**Should we discuss how the "Project Index" would look? For example, how to group multiple interviews into a single JTBD study?**

Yes. The workflow should feel kind of like a desktop app. Or like Obsidian, which also has a folder like the "Origin" folder you suggested:
Create a new project folder (inside the Origin folder), put files into it, and if the app is open, it will start transcribing. Inside the app, there is a browser to browse project folders and see the files (maybe add metadata to the project and individual files).
This is "file storage" of source files.

I guess a project folder would also have a "transcripts and analysis" folder, where it can store transcripts and jtdb data.

So really an "input" folder and an "output" folder. Would both of the be stored in the database?

This "Obsidian-style" approach—where the file system is the source of truth—is the perfect architectural choice for this project. It makes the app feel like a professional tool rather than a temporary web toy.

To answer your question: **The data lives in two places simultaneously, but for different reasons.**

### 1. The "Input" Folder (Source Files)

* **Physical Location:** On the user's hard drive (managed via the File System Access API).
* **Database Role:** The database does **not** store the video/audio file. It only stores a **pointer** (File Handle) and metadata (file size, duration, "Processed" status).
* **Why?** Browsers have storage limits (usually a few GBs). If you put 10 hours of 4K video into IndexedDB, you'll crash the browser. By keeping the "Input" on the disk, you can handle unlimited amounts of raw footage.

### 2. The "Output" Folder (Transcripts & Analysis)

* **Physical Location:** A sub-folder (e.g., `.jtbd_data/`) inside the project folder.
* **Database Role:** The database **does** store the full transcript, the speaker segments, and the "Priority Index" calculations.
* **Why?** Speed. Searching through a transcript or calculating an Opportunity Score across 20 files needs to be instant. Querying a database is milliseconds; reading 20 separate JSON files from a disk is slow.

---

### The "Mirror" Synchronization Concept

The app acts as a bridge between the **Disk** and the **Database**.

| Action | Disk (The "Truth") | Database (The "Engine") |
| --- | --- | --- |
| **New Video Added** | User drops `interview.mp4` into folder. | App detects new file, creates a "Pending" record. |
| **Transcription** | App writes `interview.json` to `.jtbd_data/`. | App loads the text into IndexedDB & Vector DB for search. |
| **User Deletes File** | User deletes `old_video.mp4`. | App sees it's gone and asks: "Keep or delete associated transcript?" |

---

### Project Structure (The "Obsidian" Vault Model)

When a user creates a new project, the app would suggest or create this structure on their PC:

```text
/My_JTBD_Project/
├── [Input]
│   ├── interview_01.mp4
│   ├── interview_02.wav
│   └── survey_results.csv
└── .jtbd_workspace/ (Hidden/System Folder)
    ├── transcripts/
    │   ├── interview_01.json
    │   └── interview_02.json
    ├── project_metadata.db (The IndexedDB export)
    └── exports/
        └── final_report.pdf

```

### Why this is "Robust"

1. **Portability:** A consultant can zip up the entire `/My_JTBD_Project/` folder, send it to a colleague who has the PWA, and they can open it and see everything exactly as it was.
2. **Human Readable:** If your app disappeared tomorrow, the user still has their transcripts in open `.json` formats inside that folder. This builds immense **trust** with professional researchers.
3. **Metadata:** You can store "Notes" or "Interviewee Profile" data inside the database, but periodically "flush" or save them to a `metadata.json` file in the folder so the disk stays in sync with the app.

### The "Watcher" Logic

Since this is a PWA, it can't "watch" the folder while the tab is closed.

* **On Startup:** The app "scans" the Project Folder.
* **The Delta:** It compares the files on disk with the records in the database.
* **Auto-Transcription:** If it sees `interview_03.mp4` on disk but has no transcript in the database, it automatically kicks off the **Audio Preprocessor** and **Whisper** pipeline we built.

**Would you like to see how the "Project Browser" UI would look? We could design a view that shows the file tree alongside the "Transcription Progress" for each file.**

yes, but I also have a question. As an extreme example, say someone uses the app every day for 20 years. This means lots of data in the db. Is there a way to estimate how many hours, days, years of interview transcription could be stored in the db? Ballpark?

This is a great question. Because we are using **Local-First** storage, the "limit" is actually defined by the user’s hard drive and the browser’s disk quota, rather than a cloud server's pricing tier.

If we assume a "heavy user" scenario (20 years of daily work), we have to look at the storage footprint of **Text (Transcripts)** vs. **Vectors (Search)** vs. **Audio/Video (Source)**.

### The Storage Breakdown (Per Hour of Interview)

1. **Raw Text (Transcript):** A 1-hour interview is roughly 10,000 words. In JSON format with timestamps and speaker IDs, this is about **1 MB to 2 MB**.
2. **Vector Embeddings (Search):** To make that hour searchable by "intent" or "meaning," we store numerical vectors. For an hour of speech, this adds roughly **5 MB to 10 MB**.
3. **Media (The Heavy Lifter):** This is where the 20-year limit usually hits.
* **Original Video:** ~1 GB to 2 GB per hour.
* **Processed Audio (Cleaned 16kHz Mono):** ~60 MB per hour.



---

### The 20-Year Estimate (Ballpark)

If a user does **one 1-hour interview every single working day** (250 days a year) for 20 years:

| Data Type | 1 Year (250 hrs) | 20 Years (5,000 hrs) | Where it Lives |
| --- | --- | --- | --- |
| **Database (Text/Vectors)** | ~2.5 GB | **~50 GB** | **IndexedDB** |
| **Processed Audio Blobs** | ~15 GB | **~300 GB** | **Local Folder** |
| **Original Video Files** | ~500 GB | **~10 TB** | **External Drive/NAS** |

### The Verdict: Can the Browser Handle It?

* **The Database:** Modern browsers (Chrome/Edge) allow PWAs to use up to **80% of total disk space**. If a researcher has a 1TB SSD, the browser can comfortably hold **800GB** of data.
* **20-Year Verdict:** **YES.** The 50GB of transcription data and metadata would easily fit in the database.


* **The Media:** No browser will let you store 10TB of video in the "app."
* **20-Year Verdict:** This is why the **Obsidian/File System** approach is mandatory. The user keeps the massive video files on an external drive, and the app simply "reads" them when plugged in.



---

### Managing "Data Bloat" Over 20 Years

To ensure the app doesn't slow down as the database grows to 50GB, we need two specific architectural features:

#### 1. Lazy Loading / Virtualization

You don't load all 5,000 interviews into memory at once. The "Project Browser" only loads the file list. Transcripts are only pulled from IndexedDB when the specific project is opened.

#### 2. Vector Archiving

Vector databases (Orama/Voy) are fastest when they fit in RAM. For a 20-year archive, we would implement **"Project-Level Indexing."** The app only "activates" the search index for the projects the user is currently working on, keeping the global search fast.

### The "Obsidian" Benefit

If the user reaches Year 15 and their computer is lagging, they can simply move the "Project Folder" for Year 1 to a backup drive. Since the transcript and metadata live *inside* that folder (as we discussed), they haven't "lost" the data—they’ve just archived it. When they need it again, they point the app back at that folder, and it "re-hydrates" the database.

**Does 50GB for a lifetime of research sound manageable to you, or should we look into "Thin Transcripts" (text-only, no timestamps) for long-term archiving?**

Sounds fine. Lets discuss the Project Browser" UI

For a professional "Workbench" app, the Project Browser needs to feel like a high-end file manager (think VS Code or Obsidian) rather than a simple list. It’s the user’s "Command Center" where they can see the status of their entire research library at a glance.

Since the app is "Local-First," the UI needs to clearly distinguish between what is on the **Disk** and what has been **Processed** by the AI.

---

## The "Command Center" Layout

I suggest a **Three-Column Dashboard** to maximize efficiency for power users.

### Column 1: The Sidebar (The Navigation)

* **Folder Tree:** A familiar view of the "Origin" folder and its sub-projects.
* **Smart Filters:**
* *Recent:* Interviews handled in the last 48 hours.
* *Processing:* A list of files currently being transcribed/normalized.
* *Needs Attention:* Files with low-confidence transcription or missing metadata.


* **The "Add Project" Button:** Creates a new folder on the physical disk via the File System Access API.

### Column 2: The Project View (The Workhorse)

This is where the user sees the files inside a specific project. I’d recommend a **Table View** for scannability, with these columns:

* **Status Icon:** (e.g., 🔴 *Original*, 🟡 *Processing*, 🟢 *Ready*).
* **File Name:** With a quick rename option.
* **Speaker Count:** Automatically populated by the transcription engine.
* **Top Insights:** A small badge showing how many "Insight Cards" have been clipped from this file.
* **Opportunity Score:** (If calculated) A color-coded number showing the ODI priority for this interview.

### Column 3: The Inspector (The Detail)

When a file is clicked (but not yet opened), this panel slides out to show:

* **Media Preview:** A small, muted video player to confirm it's the right footage.
* **Quick Metadata:** Edit interviewee name, role, or JTBD "Segment."
* **Audit Log:** "Processed on May 12, 2026, using Whisper-Small."

---

## The "Studio" Processing HUD

Because transcription takes time, the UI needs a persistent **Status HUD** (Heads-Up Display) at the bottom or top of the screen.

* **Queue Management:** Show that 3 files are queued for normalization and 1 is currently being transcribed.
* **Real-time Progress:** A bar for the **Audio Preprocessor** (fast) and a separate one for the **AI Transcription** (slower).

---

## Key "Obsidian-Style" Features

### 1. The "Ghost File" State

If a user moves a file out of the folder on their PC, the app shouldn't just delete the record. It should show a **"Ghost"** entry:

> *“Interview_04.mp4 is missing. Transcription and 12 Insight Cards are still saved. [Relink File]”*

### 2. Search-Everywhere (Command + K)

Since we have a local **Vector Database**, the search bar in the Project Browser shouldn't just look for filenames. It should look for **meaning**.

* *User searches:* "Struggling with battery life."
* *App shows:* Interviews where the user *talked* about battery issues, even if the filename is `DSC_001.mp4`.


---

## Technical Implementation Tip: "Virtual Scrolling"

When that user hits the **20-year mark** and has 5,000 interviews in one project, a standard list will lag. We’ll use "Virtual Scrolling," which only renders the 10 rows currently visible on the screen, keeping the UI buttery smooth regardless of database size.

**Would you like to design the "File Sync" logic—specifically how the app should handle it when a user drops a brand-new folder into the Origin directory while the app is closed?**



### Handling "External" File Sync (The "Watcher" Logic)

When a user drops a new folder into the **Origin** directory while the app is closed, the PWA needs a robust "Discovery & Reconcile" process upon the next launch. Since browser-based PWAs cannot watch the disk in the background, the "First 5 Seconds" of a session are critical.

#### 1. The Discovery Phase (The "Diff")

When the app opens, it recursively scans the registered **Origin Folder**.

* **The Check:** It compares the absolute file paths on the disk against the records in your local IndexedDB.
* **New Items:** Any folder or file found on disk but *not* in the DB is flagged as "New."
* **Missing Items:** Any record in the DB that no longer has a corresponding file on disk is flagged as "Orphaned."

#### 2. The User Prompt (Decision Points)

Instead of automatically starting 50 transcriptions (which could drain the battery or lag the computer), the app should present a **Sync Summary**:

* *"I found 3 new project folders. Should I index them?"*
* *"I noticed 'Interview_Final.mp4' was moved. Relink it?"*

#### 3. Automatic Processing Rules

You can allow users to set "Folder Rules" to make it feel more like a desktop app:

* **Auto-Process:** "Automatically transcribe any new `.mp4` or `.wav` file added to a Project Folder."
* **Smart Naming:** "If a folder contains a `metadata.json`, use it to populate the Project Inspector."

### The "Project Browser" UI: Sync States

In the UI, these "Syncing" actions should be visible so the user feels the app is alive.

* **Scanning Animation:** A subtle pulse near the project name while the app confirms the file integrity.
* **The "Unindexed" State:** Files found on disk but not yet processed appear with a "dotted" outline or a greyed-out icon.
* **Batch Action Bar:** If the user drops 10 files in, a "Process All" button should appear at the top of the file table.

### Why this is "Obsidian-like"

Obsidian excels because it doesn't try to hide the files from you; it enhances them. By having your app "reconcile" the disk vs. the DB on every launch, you ensure that the user can still use their standard computer file explorer to move things around, and your app will simply "catch up" the next time it's opened.

**How would you like to handle "Orphaned" data? If a user deletes a video file on their PC, should the app keep the transcript for safety, or delete it to keep the "Mirror" clean?**

It should keep the transcript and other derived files. The user may just want to clear up disk space.

That is a very safe and "professional" design choice. In research, the transcript and the analysis (the "derived data") are often more valuable than the raw footage once the initial work is done.

This approach turns your app into a **Long-term Knowledge Base** rather than just a media player.

### The "Orphaned" UI State

When the raw video is deleted but the data remains, the UI needs to handle this gracefully so the user doesn't think the app is broken.

1. **The "Cloud-ish" Icon:** Similar to how Spotify or Apple Music shows a "Download" icon, you can show a "Media Missing" icon (e.g., a file with a strike-through).
2. **Read-Only Transcription:** The user can still read the transcript, search for quotes, and see the "Opportunity Scores," but the Video Player and Waveform are replaced with a placeholder: *"Source media not found. [Relink File] [Locate on Disk]"*.
3. **Derived Asset Management:** Inside the Project Browser, you can add a "Clean Up" utility that shows the user how much space they would save by deleting the high-res processed audio blobs vs. keeping the lightweight text transcripts.

---

### Revised "Project Browser" Architecture

With this "Keep Everything" rule, your Project Browser now needs to manage three distinct "Layers" of data:

#### Layer 1: The Raw Source (The "Heavy" File)

* **Status:** Present or Missing.
* **Storage:** User's Disk.
* **Action:** Plays in the video player if found.

#### Layer 2: The Processed Workspace (The "Medium" File)

* **What:** The 16kHz Mono WAV we created for the waveform.
* **Storage:** Usually in the `.jtbd_workspace/` folder.
* **Utility:** If the user deletes the 2GB Video but keeps this 60MB WAV, they can still *hear* the interview and see the waveform peaks.

#### Layer 3: The Insight Layer (The "Light" Data)

* **What:** Text Transcripts, Speaker IDs, Vector Embeddings, and Insight Cards.
* **Storage:** IndexedDB + `.json` files.
* **Utility:** Always available. This is what makes your global search work.

---

### Feature Idea: The "Media-Light" Mode

Since you are keeping the transcripts when the video is gone, you could offer a **"Archive Video but Keep Audio"** feature.

1. User finishes transcribing a 5GB video.
2. They click "Archive Media."
3. The app deletes the 5GB video from the folder but keeps the 60MB processed audio blob and the transcript.
4. The user regains 99% of their disk space but can still revisit the interview at any time with full audio and search functionality.

### The "Relink" Workflow

Because users might move files between an external SSD and their internal drive, you need a "Relink" button.

* When clicked, the user selects the file's new location.
* The app verifies the file length/hash to ensure it's the same interview.
* The "Missing" icon disappears, and the Video Player is restored.

**How do you want the "Global Search" to behave for these orphaned files? Should it prioritize searching through current projects, or should it search the entire 20-year history by default?**

I guess it should search through recent history first, then further back, if nothing found.

That tiered search approach is exactly how professional research tools (and even modern OS search like Spotlight) stay fast while handling massive archives. It prevents the user from being overwhelmed by "noise" from a decade ago while still keeping that data accessible.

To make this feel like a native desktop app, the **Global Search** architecture should be built around **"Contextual Expanding Circles."**

### 1. The Search Hierarchy

When a user types into the search bar, the engine should execute in this order:

* **Circle 1: Active Project:** Instant results from the files currently open in the sidebar.
* **Circle 2: Recent Projects (Last 90 Days):** High-probability matches from ongoing research.
* **Circle 3: The Full Archive (The 20-Year Vault):** The deeper Vector Search through orphaned or archived projects.

### 2. The "Ghost" Search UI

Since we are keeping transcripts of deleted videos, the search results need to distinguish between "Live" and "Archived" evidence.

* **Live Results:** Shown with a play icon. Clicking jumps straight to the video frame.
* **Archived Results:** Shown with a "Transcript Only" icon. Clicking opens the text reader. If the user wants to see the video, the app can prompt: *"This video is currently offline. Please connect 'Backup Drive B' to relink."*

---

### 3. Implementing the "Expanding Search" Logic

To keep the UI buttery smooth, you don't wait for the deep archive search to finish before showing results. You use a **Streaming UI** pattern:

1. **Phase 1 (0-100ms):** Show local text matches from the current project.
2. **Phase 2 (100-500ms):** Populate results from recent IndexedDB records.
3. **Phase 3 (Background):** If the user scrolls down or hits "Search deeper," the Vector DB (Orama/Voy) kicks in to find semantic matches (e.g., searching for "frustration" and finding a quote about "annoyance").

---

### 4. Semantic Search vs. Keyword Search

Because you are doing JTBD research, "Keyword" search (Ctrl+F) is often useless because people use different words for the same "Job."

* **Keyword:** Finds exact matches for "Battery."
* **Semantic (Vector):** Finds the interview where the person said, *"I can't even get through a whole flight without it dying,"* because it understands the *concept* of power failure.

By keeping the Vector Index for all 20 years of transcripts in your local database (which we estimated at ~50GB), the user can perform these semantic "Magic Searches" even on videos they deleted five years ago.

---

### Architecture Checklist: The "Workbench" State

To ensure the Project Browser and Search stay in sync, your **IndexedDB Schema** for an interview should look like this:

| Field | Purpose |
| --- | --- |
| `id` | Unique identifier (UUID). |
| `filePath` | The last known location on disk. |
| `isMediaPresent` | Boolean (checked on app launch). |
| `transcriptJSON` | The full text + timestamps. |
| `vectorID` | The pointer to the semantic search index. |
| `derivedAudioPath` | Path to that 60MB "Lightweight" WAV we kept. |

### Does this Hierarchy feel right?

Usually, researchers are working on 2-3 active "Jobs" at once. Would you want a way to "Pin" certain historical projects so they are always included in the **Circle 1** search, regardless of how old they are?

Well, if user has recently opened a 10 yr old project, it should 
register as part of the circle 1 search - even if it wasn't modified

That is a crucial distinction. By basing "Circle 1" on **Recency of Access** rather than just "Date Created" or "Date Modified," you align the app’s intelligence with the user’s current mental model.

If a researcher is doing a "longitudinal study" and re-opens a project from 2016 to compare it to a 2026 project, both should be treated as "High Priority" in the search index.

### 1. The "Working Set" Logic

In memory management, this is called a **Working Set**. Your app would maintain a "Recently Viewed" list in the database.

* **Circle 1 (The Hot Index):** Any project opened in the last 14 days (configurable).
* **Circle 2 (The Warm Index):** All projects within the "Current Project Folder."
* **Circle 3 (The Cold Archive):** Everything else in the 20-year history.

### 2. Implementation: The `lastOpened` Timestamp

To make this work, every time a user clicks into a project or an interview, the app silently updates a `lastOpened` field in IndexedDB.

---

### 3. The "Project Browser" UI Integration

In your Sidebar or Project Browser, you can visually represent these circles to help the user understand why certain results are appearing first:

* **"In Focus" Section:** A small list of projects that are currently part of the "Hot Index." This gives the user a sense of "Here is what I’m currently thinking about."
* **Semantic "Drift":** If a user searches for a term and the results in Circle 1 are weak, the UI can show a small divider: *"Found 12 more matches in your Archive..."* with a button to expand. This prevents the "Hot Index" from being cluttered by accidental matches from unrelated past work.

---

### 4. Technical Strategy: The Multi-Index Search

From a coding perspective, you aren't actually running three separate searches. Instead, you are running **one search** but applying a **Weighted Score** to the results.

| Factor | Weighting (Score Multiplier) |
| --- | --- |
| **Exact Keyword Match** | $1.5$ |
| **In Current Active Project** | $2.0$ |
| **Opened in Last 7 Days** | $1.8$ |
| **Semantic Match (Vector)** | $1.2$ |
| **Archived (Media Missing)** | $0.8$ |

By using a formula like this, a "Semantic Match" from 10 years ago might still appear above a "Keyword Match" from yesterday if the AI determines it's highly relevant to the "Job" being studied.

### 5. Benefits for the Researcher

This "Recency-First" approach solves the "Context Switching" problem. If a researcher spends Monday on *Project A* and Tuesday on *Project B*, the search results for Wednesday will naturally prioritize both, making it easy to synthesize insights across the two active contexts without manually digging through folders.

**Does this "Working Set" model cover how you envision the user navigating between their current tasks and their historical library?**

We’ve covered the "Happy Path" (processing and indexing) and the "Archive Path" (managing missing media), but there are three "Power User" scenarios that will make or break the feeling of a desktop-class workbench.

If you handle these, the app moves from being a "tool" to being an "environment."

---

### 1. The "Split & Merge" Problem (Data Integrity)

In real-world research, files are messy. A user might record an interview in two parts because the camera battery died, or they might want to split a 2-hour focus group into individual speaker segments.

* **Virtual Merging:** Instead of physically merging 2GB video files (which is slow and error-prone), the app should allow a **"Virtual Session."** You tell the app: `Part_1.mp4` and `Part_2.mp4` are actually one interview.
* **The UI Impact:** The transcript appears as one continuous flow, and the "Circle 1" search treats them as a single entity, even though they are two files on the disk.

### 2. Sidecar Files (The "Project Suitcase")

Research isn't just video. Users often have PDF interview guides, photos of a user's workspace, or a CSV of survey data.

* **Non-Media Assets:** Your Project Browser should "see" these files in the folder. While you won't transcribe a photo, you should allow the user to **attach** a photo to a specific timestamp in a transcript.
* **The "Evidence Bundle":** When a user creates an "Insight Card," they might want to attach a screenshot of the video *and* a PDF page. The app needs a `references` array in the database to link these local file paths to the specific JTBD insight.

---

### 3. Folder Portability & "The Moving Origin"

What happens if the user moves their entire 20-year "Origin" folder from their `C:` drive to a new `D:` drive?

* **Relink Origin:** Instead of relinking 5,000 individual files, the app should have a **"Relink Root"** function.
* **Path Re-mapping:** The app calculates the relative path from the old root and updates the database globally.
* *Old:* `C:/Interviews/Project_A/video.mp4`
* *New:* `D:/Interviews/Project_A/video.mp4`


* **The Result:** 20 years of research is restored in 2 seconds because the internal folder structure stayed the same.

---

### 4. Versioning of Transcripts

AI transcription isn't perfect. A user might spend an hour correcting names and technical jargon in a transcript.

* **The Conflict:** What if the user accidentally hits "Re-transcribe"? They could lose an hour of manual editing.
* **The "Human-in-the-loop" Guard:** * If a transcript has been manually edited, flag it as **"Locked/Verified."**
* If a re-transcription is triggered, the app should perform a **"Diff"** (like GitHub) or save a version history in the `.jtbd_workspace` folder.



---

### 5. Exporting the "Project State"

Since you are local-first, the user's "database" is their lifeblood. You need a "Portable Project" export.

* **The "Self-Contained" Zip:** The app gathers the `.json` transcripts, the database entries for that project, and the "Insight Cards," and zips them up.
* **Collaboration:** Even without a cloud, User A can send this zip to User B. User B "Imports" it, and the app now has the full project history (minus the heavy video files, which User B would have to get via Dropbox/Hard Drive).

### Summary of Project Management Features

| Feature | User Benefit |
| --- | --- |
| **Virtual Sessions** | Handles multi-part recordings as one "Job." |
| **Asset Attachment** | Links PDFs/Images directly to timestamps. |
| **Root Relinking** | Zero-friction migration to new hard drives. |
| **Transcript Locking** | Protects manual "cleanup" work from AI overwrites. |

**Does the idea of "Virtual Merging" (Part 1 + Part 2 = One Interview) fit into the typical workflow of the interviews you're targeting?**

You're absolutely right. In JTBD research, simple audio recordings are actually quite common—think of remote phone interviews, voice memos, or extract-only field recordings.

From an architectural standpoint, an **audio-only project** is actually simpler to handle, but the UI needs to pivot to ensure the user doesn't feel like they're looking at a "broken" video player.

### 1. The "Audio-First" UI Mode

When the app detects a `.mp3`, `.wav`, or `.m4a` as the primary source:

* **The Stage:** The video player area is replaced with a **Rich Visualization Stage**. Instead of a black screen, you show a large, high-resolution waveform or a "Speaker Activity" heat map.
* **Metadata Focus:** Since there are no visuals to watch, the UI should expand the transcript and the "Insight Cards" to take up more screen real estate.
* **Cover Art/Context Image:** You could allow the user to drop a "Profile Picture" of the interviewee or a photo of the product they were discussing to occupy the visual space.

### 2. The Processing Chain (Same Path, Less Weight)

The `audioPreprocessor.ts` logic we wrote earlier actually treats video and audio exactly the same.

* **Video:** Extract audio track → Resample to 16kHz → Filter → Compress.
* **Audio:** Load audio file → Resample to 16kHz → Filter → Compress.
* **Benefit:** Audio files are significantly smaller, meaning your "20-year archive" will actually take up even less space if a large percentage of your files are audio-only.

### 3. Mixing Media in One Project

This is a frequent scenario: A researcher has 3 video interviews and 2 follow-up phone calls (audio) for the same "Job."

* **Unified Timeline:** The Project Browser should show them side-by-side.
* **Seamless Transitions:** As the user clicks from a video file to an audio file, the "Workbench" should smoothly transition from the Video Player to the Audio Visualization Stage without the user needing to change modes.

---

### Revised "Project Case" Folder Structure

To accommodate both media types, your `.jtbd_workspace` remains the consistent "brain":

```text
/Project_Alpha/
├── interview_01.mp4  (Video)
├── follow_up.mp3     (Audio)
└── .jtbd_workspace/
    ├── transcripts/
    │   ├── interview_01.json
    │   └── follow_up.json
    └── waves/
        ├── interview_01.wav (16kHz Mono for Waveform)
        └── follow_up.wav    (16kHz Mono for Waveform)

```

### 4. Special Audio-Only Feature: "The Sound Bite"

When working with audio, it's often harder to "scan" than video.

* **Skim-Reading:** Use the "Auto-Generated Headlines" (via a local LLM or Whisper's summary) to create "Chapters" in the audio file.
* **Silence Skipping:** Since audio interviews often have long pauses, you can add a "Skip Silence" toggle in the player that uses the waveform data to jump over dead air during playback.

### Does this complete the "File Management" picture for you?

We have handled:

1. **The Origin Folder** (The Obsidian-style Vault).
2. **Video & Audio** processing and normalization.
3. **The Mirror Database** (IndexedDB for speed/search).
4. **Orphaned Media** (Keeping data when the video is gone).
5. **Relinking and Portability.**

If so, we could move on to discussing the **"Insight Workbench"**—specifically how a user actually takes a 1-hour transcript and turns it into a list of **Desired Outcomes** and **Jobs to be Done**.

Make this below into a list of tasks...

### **Epic: Local-First Project Management**

#### **Technical User Story 1: The "Obsidian" Vault Connection**

> **As a** researcher, **I want** to select a local folder to serve as my "Project Origin," **so that** my sensitive research media and analysis remain entirely on my local hardware while still being accessible via the PWA.

---

### **Detailed Happy Path**

1. **Selection:** The user clicks a **"Set Origin Folder"** button in the app. A native OS directory picker appears (via `showDirectoryPicker`).
2. **Permission:** The user selects a folder (e.g., `Documents/JTBD_Research`). The browser asks for explicit **Read/Write permission**.
3. **Persistence Handshake:** * The app generates a unique ID for this "Vault."
* The **FileSystemDirectoryHandle** (the "key" to the folder) is saved into **IndexedDB**.
* *Note:* This ensures that when the user returns tomorrow, the app can ask for permission to "re-unlock" the folder rather than making the user find it again.


4. **Initial Scan:** The app recursively iterates through the folder:
* It identifies **Project Folders** (top-level subdirectories).
* It identifies **Media Files** (`.mp4`, `.mov`, `.wav`, `.mp3`).
* It looks for an existing `.jtbd_workspace` hidden folder to see if this is an existing project being re-imported.


5. **Database Mirroring:** For every file found, the app creates a "Ghost Record" in IndexedDB. This record stores the file name, size, and last modified date, but *not* the file itself.
6. **UI Population:** The Sidebar immediately renders a folder tree. Files that haven't been processed yet appear with a "New" badge or a "Ready to Transcribe" icon.
7. **Workspace Initialization:** If the folder is new, the app creates the hidden `.jtbd_workspace` directory to house future transcripts and waveform caches, ensuring the user's root folder stays clean.

---

### **The Engine (Tech Stack)**

* **Window.showDirectoryPicker():** The core browser API for selecting local folders. Using the `id` option here allows the browser to remember the last-used location.
* **IndexedDB (Dexie.js):** Essential for storing the `FileSystemDirectoryHandle`. Unlike `localStorage`, IndexedDB can store the actual "Handle" object, which is the only way to re-access the folder across sessions without a fresh picker.
* **Recursive Async Iterators:** Used to "walk" the file tree without blocking the UI. Since researchers might have hundreds of files, this scan must be non-blocking.
* **Persistent Storage API (`navigator.storage.persist()`):** A critical call to ask the browser *not* to clear the IndexedDB data during OS "disk cleaning" cycles.
* **File System Observer API (Optional/Future):** To detect in real-time when a user drops a new file into the folder while the app is already open.

### **Implementation Note for "The Mirror"**

The "Happy Path" relies on the **File Handle** being the bridge. The app should never store the path as a string (like `C:/Users/...`) because web apps cannot access paths directly for security. Instead, it always works through the **Handle**, which acts as a secure, temporary token to the physical disk.
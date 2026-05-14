Audit of version 1:

I could let Gemini turn these into bugs/user stories...

General:
- Design for responsiveness
- A11y FTW
- JTDB is just one way to analyze and visualize a transcription - need a project file format flexible enough to handle future analysis types.

Legal:
- Maybe not use the word Strategyn anywhere!
- What about ODI, job map, opportunity score, etc?

Workflow:
- Processing can take a while. Allow working on an existing project while processing another one in the background. Or add a file to a project, and work on another part of the same project (while processing).
- A nice file browser, where you can annotate files like crazy.
- Each project has its own folder, and can have sub-folders.
- Actually - decouple the ingestion phase from the specific analysis (ODI or other ways) and presentation phase. The same data sources might be parsed in different ways. Ties to processing/ingestion as a background process (see above).

Transcription:
- video transcrip is not good enough.

Analytic functionality:
- ODI is just one mode. Add others (a more simple JTDB mode, survey processing, etc). The app should eat anything and create various types of nice reports/visualizations.
- ODI also needs a job map
- Should be able to take in a web survey (Google Forms, etc). Maybe even create a survey from the app.


Video/audio stuff:
- A timeline display, kinda like transcribed Teams calls (voices in separate tracks, etc). Should be some annotation tools to help mark up the audio pre-analysis (with some helpful automation to do the grunt work).
- What can be gotten from the images? The audio stuff is just "person A said this in fram 23456", but what happens in that frame?
- Format issues: Firefox doesn't like MOV, which works fine in Chrome. Need to investigate. Iphone output was MOV, requires conversion to MP4. A hassle for users.

Processing-status bar:
- ETA function: does it work? And how exactly? More trouble than it's worth?
- ToDo list is nice. Maybe add how long each step took? Or a short summary of wht was accomplished (num of speakers identified, stuff like that)

Nice initial card design. Investigate further:
- Opening evidence expansion panel increases height of card - and the whole row. What if there are many evidence items?
- Changing OP scores by way of the sliders rearranges cards. Can be jarring. Maybe a slower animation? Or a manual "rearrange" button?
- OP score badges need a bit of padding



What I have:
- A video transcription engine
- A transcript analysis engine
- A text output of transcriptions
- An ODI desired outcomes dataformat and visualization engine
- An export functionality (JSON, CSV)

So two main elements:
- Transcription of various media
- Analysis and viz of that transcript








# Overview : 
This is a desktop application used to treat the problem a family member of mine faces everyday : 
1. receives a prescription image -> writes it down into a notebook with the client name, date, as well as the prescription written in the image
2. rewrite the exact same thing again in a very old program
3. rewrite it once more in an excel table for X brand
4. rewrite it once more in a formatted message for Y brand

this project aims to fix all of this and clean it up into one single software

---
## Features : 
- Scans images through LLM OCR (must be implemented as an env)
- Stores prescriptions into batches with the client name and everything
- view the batches, export into an excel file, check the date and search through

---
### Stack : 
- **Desktop** : Electron
- **Frontend** : React + Vite
- **Backend** : node.js (nest.js)
- **LLM Integration** : For now Gemini only, expandable

### Features to add :
- more advanced searching and filtering (through client in all batches, through date in all batches)
- more ways of exporting (export into structured messages, export into a printed paper)
- safer and more human-readable error handling
- better authentication for the app

---

### Progress : 
this is the very first version 1.0, there will definitely be more features added into this program

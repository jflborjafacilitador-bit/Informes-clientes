# Handover: n8n Workflow & Landing Page Integration

This document contains context for the next agent taking over the "Registro web / WhatsApp AI" task.

## 1. Landing Page Fix (Completed)
- **Problem:** `rpc_register_lead` did not exist in Supabase, preventing leads from being registered and hanging the UI.
- **Fix:** Switched to a direct table insert (`supabase.from('clients').insert(...)`) inside `src/pages/UserLanding.tsx`. The fix is committed and deployed to Vercel.

## 2. n8n Base Workflow (API Activation)
- **Target Workflow:** `wf_live.json` 
- **Problem:** Workflow was inactive leading to 404s on the webhook `/webhook/landing-agent`.
- **Fix:** Used n8n APIs (`push_to_n8n.cjs`) to forcibly `PUT` the workflow definition and then `POST /activate` to ensure it returns HTTP 200 OK.
- **Context:** The LLM prompt inside the `DEFAULT_LLMS_CONTEXT` (`whatsappService.ts`) was updated. The "AI Agent" node in the workflow has been left intact to prevent Langchain node schema corruption.

## 3. Multimedia (Audio/Image) Implementation
- **Problem:** The user requested "Audio and Images" capability in the main AI Agent workflow.
- **Context:** Injecting new node types (Switch, Whisper, Vision) dynamically into a live n8n canvas via code is extremely fragile due to ID mappings and nested Langchain inputs. 
- **Current State:** A completely mapped alternative workflow has been generated (`wf_multimedia.json`) using the script `create_multimedia_wf.js`. 
- **Recommendation for Next Agent:** The user wants multimedia recognition seamlessly merged into their live `iJkJqQsNI6u4BXu6` workflow. You will need to carefully modify the JSON of the active workflow to route `messageType === 'audioMessage'` -> Whisper Open AI -> Merge into `message_in` text variable before it hits the Langchain AI Agent. 

All scripts (`test_landing_webhook.cjs`, `push_to_n8n.cjs`, `wf_multimedia.json`) have been committed to GitHub (`git add .`, `git commit`, `git push`) so you can resume locally without losing progress.

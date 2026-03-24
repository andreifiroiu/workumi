# Product Mission

## Pitch
Workumi is an AI-powered work orchestration platform that helps small service teams (2-10 people) deliver projects with limited staff and uneven skill coverage by modeling work as a structured graph where AI agents act as integrated fractional team members—pushing work forward through human-approved checkpoints, not as chatbots bolted on.

**Tagline:** "AI-powered work orchestration for small teams—turn requests into deliverables, with agents doing the busywork and humans approving the outcomes."

## Users

### Primary Customers
- **Small service teams (2-10 people):** Agencies, consultancies, IT/MSP providers, studios, internal ops teams, field/maintenance teams
- **Service businesses with skill gaps:** Companies that need specialist capabilities without hiring full-time experts
- **Process-light organizations:** Teams that lack formal SOPs but need consistency and quality

### User Personas

**Team Owner/Manager** (30-50 years old)
- **Role:** Business owner or operations manager
- **Context:** Running a small service business with 2-10 people, wearing multiple hats
- **Pain Points:** Can't see what's actually happening across projects, profitability is based on "vibes" not data, scope creep destroys margins, can't afford to hire specialists for every skill gap
- **Goals:** Maintain visibility and control, protect margins, scale operations without proportional headcount growth, ensure quality without micromanaging

**Operator/Executor** (25-45 years old)
- **Role:** Service delivery team member, project coordinator, or technician
- **Context:** Handling multiple projects simultaneously, expected to deliver outside core expertise
- **Pain Points:** Context lost in Slack/email threads, unclear definition of done, asked to do work outside skillset, constantly interrupted by status requests, work postponed due to overload
- **Goals:** Clear structure for incoming work, guidance when facing skill gaps, ability to focus without constant context switching, confidence in what "done" means

**Client/Stakeholder** (Optional role)
- **Role:** External client or internal business unit receiving services
- **Context:** Needs work completed but lacks visibility into progress
- **Pain Points:** Unclear status, surprise scope changes, delayed deliverables
- **Goals:** Visibility into project status, ability to request changes with transparency, timely approvals and feedback

## The Problem

### Messy Requests Become Chaotic Work
Small teams receive work requests through multiple channels—email, Slack, phone calls, meetings. These unstructured requests lack clear scope, success criteria, or resource requirements. Without a systematic intake process, teams improvise on every project, leading to inconsistent quality, forgotten requirements, and scope creep that destroys profitability.

**Our Solution:** The Dispatcher Agent converts messy requests into structured work orders with clear scope, deliverables, and acceptance criteria. The work graph (Parties > Projects > Work Orders > Tasks > Deliverables) provides a consistent framework that prevents chaos.

### Skill Gaps Without Budget for Specialists
A 5-person agency needs copywriting, design, development, analytics, and project management—but can't afford dedicated specialists in each area. Team members are forced to work outside their expertise, resulting in delayed deliverables, lower quality output, and burnout from constant context switching.

**Our Solution:** Domain-specific AI agents (Copy/Marketing, Design, Tech, Analyst, Ops) act as fractional team members who draft work in their specialty areas. Humans review and approve, but don't need to be experts in every domain. Agents fill gaps as "fractional employees" without requiring full-time hires.

### No SOPs, Just Tribal Knowledge
Small teams operate on informal processes and tribal knowledge. When someone is sick or leaves, critical knowledge disappears. New team members struggle to learn "how we do things" because nothing is documented. Quality varies based on who's doing the work.

**Our Solution:** The SOP engine with templates, checklists, and evidence requirements creates repeatable processes without formal documentation overhead. The QA/Compliance Agent validates outputs against defined standards, ensuring consistency even as the team scales or changes.

### Lost Context Across Tools
Project conversations happen in Slack, decisions are buried in email threads, files live in Google Drive, and nobody knows what's current. Team members waste hours reconstructing context before they can actually do work. Critical decisions and changes are forgotten or contradicted.

**Our Solution:** The comms log ties all conversations to specific work items in the work graph. Context lives with the work, not scattered across communication tools. AI agents can reference entire conversation history when drafting work, ensuring continuity.

### No Accountability or Definition of Done
Without clear checkpoints, work exists in a gray area between "in progress" and "complete." Teams ship work without proper review, hoping clients won't notice issues. Or they over-iterate, perfectionism eating profit margins. Nobody knows when something is truly "done."

**Our Solution:** Non-negotiable human checkpoints (Draft > Review > Approve > Deliver) create clear accountability. Agents can Draft, humans must Review and Approve, only then can work be Delivered. This protects quality without creating bureaucracy.

### Profitability Blindness
Small teams often don't track time accurately, estimate based on gut feel, and discover profit problems only after projects are complete. They can't identify which types of work or clients are actually profitable. Scope creep happens invisibly until the invoice conversation reveals the damage.

**Our Solution:** Time tracking integrated with work orders, budget vs actuals dashboards, and the Finance Agent flagging margin problems in real-time. Change order flow makes scope additions visible and billable. Profitability becomes data-driven, not vibes-driven.

## Differentiators

### AI Agents as Resources, Not Chatbots
Unlike productivity tools with AI features bolted on, Workumi treats AI agents as actual team resources. They're assigned to work items, have specific domains of expertise, operate through controlled tool access, and follow your SOPs. They're not generic chatbots—they're specialized fractional employees integrated into your workflow.

This results in agents that understand your business context, follow your processes, and deliver work that feels like it came from a team member, not a generic AI assistant.

### Human Checkpoints Are Non-Negotiable
Unlike automation platforms that try to eliminate humans, Workumi enforces human oversight at critical moments. Agents can Draft, but only humans can Approve and Deliver. This prevents runaway automation disasters while still capturing 80% of the time savings from AI-generated first drafts.

This results in confident adoption—teams trust the system because humans remain in control, while still benefiting from massive productivity gains on the busywork.

### CRM is Optional, Not Required
Unlike project management tools that assume you're a customer-facing business, Workumi works perfectly for internal ops teams, IT departments, and maintenance crews who don't need CRM concepts. The core work graph (Projects > Work Orders > Tasks) functions independently. Add the CRM module only if you need client management, pipelines, and SLAs.

This results in faster adoption and simpler workflows for teams that just need to organize internal work, without forcing them into a "customer-centric" mental model.

### Tool Gateway Architecture
Unlike AI agents with open-ended tool access, Workumi agents operate only through controlled, auditable tools defined by the Tool Gateway. Every agent action is logged, constrained by permissions, and validated against business rules. No agent can "go rogue" or access systems outside its defined toolset.

This results in enterprise-grade safety and auditability while maintaining agent autonomy within guardrails.

### SOP-Driven AI
Unlike generic AI that operates on general knowledge, Workumi agents follow your documented SOPs, templates, and checklists. The QA/Compliance Agent validates outputs against your standards, not generic best practices. Your playbooks guide agent behavior.

This results in output that matches your brand voice, follows your quality standards, and respects your business rules—not generic AI-generated content.

### Outcome-Based Pricing Option
Unlike seat-based SaaS that charges per person, Workumi offers an optional "Autopilot" pricing tier where you pay per work order or deliverable completed. This aligns pricing with value delivered rather than team size, making AI agents feel like contractors you pay for output, not software you pay to access.

This results in pricing that scales with business results, not arbitrary seat counts, making growth more predictable and profitable.

## Key Features

### Core Operations Features
- **Work Graph Structure:** Parties > Projects > Work Orders > Tasks > Deliverables provide a consistent framework for all work
- **SOPs and Templates:** Repeatable checklists, templates, and evidence requirements ensure consistent quality
- **Approvals Inbox:** Centralized queue for internal reviews and optional external client approvals
- **Documents and Artifacts:** Attach files, drafts, and deliverables directly to work items with version history
- **Comms Log:** Threaded conversations tied to specific work items, maintaining context with the work
- **Time Tracking:** Log time against work orders and tasks for accurate profitability analysis
- **Human Checkpoints:** Enforced Draft > Review > Approve > Deliver workflow prevents work from shipping without oversight

### AI Agent Features
- **Dispatcher Agent:** Converts messy requests into structured work orders with scope, routing, and priorities
- **PM Copilot Agent:** Creates project plans, identifies milestones, maps dependencies, suggests resource allocation
- **Domain Skill Agents:** Specialized agents for Copy/Marketing, Operations, Analytics, Tech, and Design who draft work in their expertise areas
- **QA/Compliance Agent:** Validates deliverables against SOPs, checklists, and quality standards before human review
- **Finance Agent:** Drafts estimates and invoices, flags margin problems, analyzes budget vs actuals
- **Client Comms Agent:** Drafts professional client communications and updates, but never auto-sends without human approval
- **Workflow Orchestration:** Agents can trigger each other, passing context and artifacts through multi-step workflows

### Collaboration Features
- **Change Order Flow:** Scope changes require approval before work proceeds, keeping budgets and expectations aligned
- **Evidence Requirements:** SOPs can require specific artifacts or proof before work can be marked complete
- **Delegation and Assignment:** Route work to specific team members or agent types based on skills needed
- **Status Visibility:** Real-time dashboards show what's in Draft, Review, Approved, and Delivered states
- **Context Preservation:** All conversations, decisions, and file versions stay attached to work items

### Business Intelligence Features
- **Budget vs Actuals:** Track estimated hours and costs against actual time logged and expenses incurred
- **Margin Dashboards:** See profitability by project, work order type, client, or team member
- **Capacity Planning:** Understand team workload and identify bottlenecks or overallocation
- **Agent Contribution Tracking:** See which agents are producing the most value and where humans spend review time

### Optional Module Features
- **CRM Module:** Client and contact management, deal pipelines, SLA tracking, relationship history
- **Finance Module:** Detailed estimates and invoices, payment tracking, expense management, profitability reports
- **Helpdesk Module:** Ticket management, customer portal for submissions, SLA compliance, support workflows

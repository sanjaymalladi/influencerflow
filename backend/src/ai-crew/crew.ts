import { Agent, Task, Crew } from 'crewai';
import { FileReaderTool } from './tools/file-read-tool.js';
import { CreatorDBTool } from './tools/creator-db-tool.js';

// Initialize Tools
const fileTool = new FileReaderTool();
const dbTool = new CreatorDBTool();

// Define Agents

// Agent 1: The Campaign Analyst
// This agent's job is to read and understand the campaign brief.
export const campaignAnalyst = new Agent({
  role: 'Expert Campaign Analyst',
  goal: 'Read a campaign brief document and extract key campaign parameters like budget, timeline, target audience, and creator requirements into a structured JSON object.',
  backstory: `You are a world-class marketing analyst. You are an expert at reading unstructured campaign briefs and turning them into actionable data for your team. You only use the tools provided to you.`,
  verbose: true,
  allowDelegation: false,
  tools: [fileTool]
});

// Agent 2: The Creator Scout
// This agent finds influencers who match the brief.
export const creatorScout = new Agent({
  role: 'Expert Creator Scout',
  goal: 'Find a list of creators from the database that perfectly match the campaign requirements provided by the Campaign Analyst.',
  backstory: `You are an expert talent scout with a deep understanding of the influencer landscape. You have a knack for finding hidden gems and matching them with brands. You use your database tool to find the perfect fit based on the structured data provided by the Analyst.`,
  verbose: true,
  allowDelegation: false,
  tools: [dbTool]
});

// Define Tasks

export const analysisTask = (filePath: string) => new Task({
  description: `Read and analyze the campaign brief located at the path: ${filePath}. Extract the core requirements (e.g., campaign name, budget, ideal creator niche, follower count, content deliverables) into a structured JSON object.`,
  agent: campaignAnalyst,
  expected_output: 'A single JSON object containing the structured campaign parameters. For example: { "campaignName": "Nike AF1 Launch", "budget": 10000, "niche": "fashion", "minFollowers": 50000, "deliverables": "1 Instagram Post, 2 Stories" }'
});

export const scoutingTask = new Task({
  description: `Using the structured campaign requirements from the analysis task, search the creator database for the top 5 most relevant creators. Your final answer must be a list of creator profiles found from your search tool.`,
  agent: creatorScout,
  expected_output: 'A JSON array of creator profiles that match the requirements.'
});

// Assemble the Crew
export const campaignCrew = new Crew({
  agents: [campaignAnalyst, creatorScout],
  tasks: [
    // Tasks are dynamically added when the crew is kicked off
  ],
  verbose: 2
}); 
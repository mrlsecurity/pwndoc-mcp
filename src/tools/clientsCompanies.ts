import type { ToolDef } from "./types.js";
import { jsonOut } from "./types.js";
import {
  createClient,
  updateClient,
  deleteClient,
  listCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from "../api/clients.js";
import { requireConfirm } from "../lib/confirm.js";

export const clientCompanyTools: ToolDef[] = [
  // --- Clients ---
  {
    name: "create_client",
    description: "Create a client (external contact). `email` is required; company is referenced by name.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string" },
        firstname: { type: "string" },
        lastname: { type: "string" },
        phone: { type: "string" },
        cell: { type: "string" },
        title: { type: "string" },
        company: { type: "object", properties: { name: { type: "string" } } },
      },
      required: ["email"],
    },
    handler: async (args) => jsonOut(await createClient(args)),
  },
  {
    name: "update_client",
    description: "Patch a client by id. Any omitted field is left untouched.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: { type: "string" },
        email: { type: "string" },
        firstname: { type: "string" },
        lastname: { type: "string" },
        phone: { type: "string" },
        cell: { type: "string" },
        title: { type: "string" },
        company: { type: "object", properties: { name: { type: "string" } } },
      },
      required: ["clientId"],
    },
    handler: async ({ clientId, ...patch }) => jsonOut(await updateClient(clientId, patch)),
  },
  {
    name: "delete_client",
    description: "Delete a client. Requires confirm:true.",
    inputSchema: {
      type: "object",
      properties: { clientId: { type: "string" }, confirm: { type: "boolean" } },
      required: ["clientId", "confirm"],
    },
    handler: async (args) => {
      requireConfirm(args, "delete_client");
      await deleteClient(args.clientId);
      return jsonOut({ ok: true, deletedClientId: args.clientId });
    },
  },

  // --- Companies ---
  {
    name: "list_companies",
    description: "List all companies known to PwnDoc.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => jsonOut(await listCompanies()),
  },
  {
    name: "get_company",
    description: "Fetch a single company by id.",
    inputSchema: {
      type: "object",
      properties: { companyId: { type: "string" } },
      required: ["companyId"],
    },
    handler: async ({ companyId }) => jsonOut(await getCompanyById(companyId)),
  },
  {
    name: "create_company",
    description: "Create a new company.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        shortName: { type: "string" },
        logo: { type: "string", description: "Base64 PNG or data: URL." },
      },
      required: ["name"],
    },
    handler: async (args) => jsonOut(await createCompany(args)),
  },
  {
    name: "update_company",
    description: "Patch a company by id.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: { type: "string" },
        name: { type: "string" },
        shortName: { type: "string" },
        logo: { type: "string" },
      },
      required: ["companyId"],
    },
    handler: async ({ companyId, ...patch }) => jsonOut(await updateCompany(companyId, patch)),
  },
  {
    name: "delete_company",
    description: "Delete a company. Requires confirm:true.",
    inputSchema: {
      type: "object",
      properties: { companyId: { type: "string" }, confirm: { type: "boolean" } },
      required: ["companyId", "confirm"],
    },
    handler: async (args) => {
      requireConfirm(args, "delete_company");
      await deleteCompany(args.companyId);
      return jsonOut({ ok: true, deletedCompanyId: args.companyId });
    },
  },
];

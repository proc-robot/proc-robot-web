
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "ai_jobs": {
                  Row: {
                    "attempts": number,"cost_usd": number | null,"created_at": string,"created_by": string | null,"credits_consumed": number | null,"credits_reserved": number,"credits_settled_at": string | null,"error": string | null,"finished_at": string | null,"heartbeat_at": string | null,"id": string,"input_tokens": number | null,"msg_id": number | null,"organization_id": string,"output_tokens": number | null,"payload": NonNullable<Json>,"progress": number,"progress_message": string | null,"queue": string,"result": Json | null,"started_at": string | null,"status": Database["public"]['Enums']["job_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"cost_usd"?: number | null,"created_at"?: string,"created_by"?: string | null,"credits_consumed"?: number | null,"credits_reserved"?: number,"credits_settled_at"?: string | null,"error"?: string | null,"finished_at"?: string | null,"heartbeat_at"?: string | null,"id"?: string,"input_tokens"?: number | null,"msg_id"?: number | null,"organization_id": string,"output_tokens"?: number | null,"payload"?: NonNullable<Json>,"progress"?: number,"progress_message"?: string | null,"queue": string,"result"?: Json | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["job_status"],"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"cost_usd"?: number | null,"created_at"?: string,"created_by"?: string | null,"credits_consumed"?: number | null,"credits_reserved"?: number,"credits_settled_at"?: string | null,"error"?: string | null,"finished_at"?: string | null,"heartbeat_at"?: string | null,"id"?: string,"input_tokens"?: number | null,"msg_id"?: number | null,"organization_id"?: string,"output_tokens"?: number | null,"payload"?: NonNullable<Json>,"progress"?: number,"progress_message"?: string | null,"queue"?: string,"result"?: Json | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["job_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_jobs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_app_role": Database["public"]['Enums']["app_role"] | null,"actor_id": string | null,"id": number,"metadata": NonNullable<Json>,"occurred_at": string,"organization_id": string | null,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_app_role"?: Database["public"]['Enums']["app_role"] | null,"actor_id"?: string | null,"id"?: never,"metadata"?: NonNullable<Json>,"occurred_at"?: string,"organization_id"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_app_role"?: Database["public"]['Enums']["app_role"] | null,"actor_id"?: string | null,"id"?: never,"metadata"?: NonNullable<Json>,"occurred_at"?: string,"organization_id"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "id": string,"name": string,"parent_id": string | null,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"parent_id"?: string | null,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"parent_id"?: string | null,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"credit_balances": {
                  Row: {
                    "organization_id": string,"plan_credits": number,"plan_period_start": string | null,"topup_credits": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "organization_id": string,"plan_credits"?: number,"plan_period_start"?: string | null,"topup_credits"?: number,"updated_at"?: string
                  }
                  Update: {
                    "organization_id"?: string,"plan_credits"?: number,"plan_period_start"?: string | null,"topup_credits"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "credit_balances_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: true
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"credit_ledger": {
                  Row: {
                    "amount": number,"balance_after": number,"bucket": Database["public"]['Enums']["credit_bucket"],"created_at": string,"created_by": string | null,"entry": Database["public"]['Enums']["credit_entry"],"id": number,"job_id": string | null,"organization_id": string,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"balance_after": number,"bucket": Database["public"]['Enums']["credit_bucket"],"created_at"?: string,"created_by"?: string | null,"entry": Database["public"]['Enums']["credit_entry"],"id"?: never,"job_id"?: string | null,"organization_id": string,"reason"?: string | null
                  }
                  Update: {
                    "amount"?: number,"balance_after"?: number,"bucket"?: Database["public"]['Enums']["credit_bucket"],"created_at"?: string,"created_by"?: string | null,"entry"?: Database["public"]['Enums']["credit_entry"],"id"?: never,"job_id"?: string | null,"organization_id"?: string,"reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "credit_ledger_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "ai_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "credit_ledger_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "address": string | null,"contact_name": string | null,"created_at": string,"email": string | null,"id": string,"name": string,"notes": string | null,"organization_id": string,"phone": string | null,"tax_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"organization_id"?: string,"phone"?: string | null,"tax_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"organization_id"?: string,"phone"?: string | null,"tax_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"documents_in": {
                  Row: {
                    "created_at": string,"error": string | null,"estimated_credits": number | null,"file_name": string,"file_path": string,"file_size": number,"file_type": string,"id": string,"job_id": string | null,"organization_id": string,"page_count": number | null,"project_id": string,"row_count": number | null,"scanned": boolean | null,"status": Database["public"]['Enums']["document_status"],"updated_at": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error"?: string | null,"estimated_credits"?: number | null,"file_name": string,"file_path": string,"file_size": number,"file_type": string,"id"?: string,"job_id"?: string | null,"organization_id"?: string,"page_count"?: number | null,"project_id": string,"row_count"?: number | null,"scanned"?: boolean | null,"status"?: Database["public"]['Enums']["document_status"],"updated_at"?: string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"error"?: string | null,"estimated_credits"?: number | null,"file_name"?: string,"file_path"?: string,"file_size"?: number,"file_type"?: string,"id"?: string,"job_id"?: string | null,"organization_id"?: string,"page_count"?: number | null,"project_id"?: string,"row_count"?: number | null,"scanned"?: boolean | null,"status"?: Database["public"]['Enums']["document_status"],"updated_at"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_in_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "ai_jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_in_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_in_organization_id_project_id_fkey"
      columns: ["organization_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"fx_rates": {
                  Row: {
                    "as_of": string,"currency": string,"fetched_at": string,"per_usd": number,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "as_of": string,"currency": string,"fetched_at"?: string,"per_usd": number,"source": string
                  }
                  Update: {
                    "as_of"?: string,"currency"?: string,"fetched_at"?: string,"per_usd"?: number,"source"?: string
                  }
                  Relationships: [
                    
                  ]
                },"invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"org_role": Database["public"]['Enums']["org_role"],"organization_id": string,"revoked_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"org_role": Database["public"]['Enums']["org_role"],"organization_id": string,"revoked_at"?: string | null
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"org_role"?: Database["public"]['Enums']["org_role"],"organization_id"?: string,"revoked_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"item_lists": {
                  Row: {
                    "confirmed_at": string | null,"confirmed_by": string | null,"created_at": string,"document_id": string | null,"id": string,"issues": NonNullable<Json>,"model": string | null,"organization_id": string,"project_id": string,"status": Database["public"]['Enums']["item_list_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"document_id"?: string | null,"id"?: string,"issues"?: NonNullable<Json>,"model"?: string | null,"organization_id"?: string,"project_id": string,"status"?: Database["public"]['Enums']["item_list_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"document_id"?: string | null,"id"?: string,"issues"?: NonNullable<Json>,"model"?: string | null,"organization_id"?: string,"project_id"?: string,"status"?: Database["public"]['Enums']["item_list_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_lists_organization_id_document_id_fkey"
      columns: ["organization_id","document_id"]
isOneToOne: false
      referencedRelation: "documents_in"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "item_lists_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_lists_organization_id_project_id_fkey"
      columns: ["organization_id","project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"jobs_dead_letter": {
                  Row: {
                    "attempts": number,"error": string | null,"failed_at": string,"id": number,"job_id": string | null,"message": NonNullable<Json>,"msg_id": number | null,"organization_id": string | null,"queue": string,"resolved_at": string | null,"resolved_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts": number,"error"?: string | null,"failed_at"?: string,"id"?: never,"job_id"?: string | null,"message": NonNullable<Json>,"msg_id"?: number | null,"organization_id"?: string | null,"queue": string,"resolved_at"?: string | null,"resolved_by"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"error"?: string | null,"failed_at"?: string,"id"?: never,"job_id"?: string | null,"message"?: NonNullable<Json>,"msg_id"?: number | null,"organization_id"?: string | null,"queue"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_dead_letter_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "ai_jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"list_items": {
                  Row: {
                    "confidence": NonNullable<Json>,"created_at": string,"description": string | null,"embedding": string | null,"id": string,"item_list_id": string,"name": string,"notes": string | null,"organization_id": string,"position": number,"quantity": number | null,"source_ref": NonNullable<Json>,"specs": NonNullable<Json>,"unit": string | null,"unit_code": string | null,"updated_at": string,"validation_flags": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "confidence"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"embedding"?: string | null,"id"?: string,"item_list_id": string,"name": string,"notes"?: string | null,"organization_id"?: string,"position": number,"quantity"?: number | null,"source_ref"?: NonNullable<Json>,"specs"?: NonNullable<Json>,"unit"?: string | null,"unit_code"?: string | null,"updated_at"?: string,"validation_flags"?: NonNullable<Json>
                  }
                  Update: {
                    "confidence"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"embedding"?: string | null,"id"?: string,"item_list_id"?: string,"name"?: string,"notes"?: string | null,"organization_id"?: string,"position"?: number,"quantity"?: number | null,"source_ref"?: NonNullable<Json>,"specs"?: NonNullable<Json>,"unit"?: string | null,"unit_code"?: string | null,"updated_at"?: string,"validation_flags"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "list_items_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "list_items_organization_id_item_list_id_fkey"
      columns: ["organization_id","item_list_id"]
isOneToOne: false
      referencedRelation: "item_lists"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "list_items_unit_code_fkey"
      columns: ["unit_code"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["code"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "address": string | null,"category_slugs": (string)[],"country": string,"created_at": string,"default_currency": string,"deleted_at": string | null,"description": string | null,"email": string | null,"id": string,"logo_path": string | null,"name": string,"plan_id": string,"settings": NonNullable<Json>,"slug": string,"status": string,"tax_id": string | null,"updated_at": string,"verified_at": string | null,"website": string | null,"whatsapp_number": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"category_slugs"?: (string)[],"country": string,"created_at"?: string,"default_currency": string,"deleted_at"?: string | null,"description"?: string | null,"email"?: string | null,"id"?: string,"logo_path"?: string | null,"name": string,"plan_id"?: string,"settings"?: NonNullable<Json>,"slug": string,"status"?: string,"tax_id"?: string | null,"updated_at"?: string,"verified_at"?: string | null,"website"?: string | null,"whatsapp_number"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"category_slugs"?: (string)[],"country"?: string,"created_at"?: string,"default_currency"?: string,"deleted_at"?: string | null,"description"?: string | null,"email"?: string | null,"id"?: string,"logo_path"?: string | null,"name"?: string,"plan_id"?: string,"settings"?: NonNullable<Json>,"slug"?: string,"status"?: string,"tax_id"?: string | null,"updated_at"?: string,"verified_at"?: string | null,"website"?: string | null,"whatsapp_number"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "organizations_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "created_at": string,"features": NonNullable<Json>,"id": string,"is_active": boolean,"limits": NonNullable<Json>,"name": string,"price_usd": number,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"features": NonNullable<Json>,"id": string,"is_active"?: boolean,"limits": NonNullable<Json>,"name": string,"price_usd": number,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"features"?: NonNullable<Json>,"id"?: string,"is_active"?: boolean,"limits"?: NonNullable<Json>,"name"?: string,"price_usd"?: number,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_settings": {
                  Row: {
                    "description": string,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "app_role": Database["public"]['Enums']["app_role"],"avatar_url": string | null,"created_at": string,"display_currency": string | null,"email": string,"format_locale": string,"full_name": string | null,"home_view": string,"id": string,"org_role": Database["public"]['Enums']["org_role"] | null,"organization_id": string | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "app_role"?: Database["public"]['Enums']["app_role"],"avatar_url"?: string | null,"created_at"?: string,"display_currency"?: string | null,"email": string,"format_locale"?: string,"full_name"?: string | null,"home_view"?: string,"id": string,"org_role"?: Database["public"]['Enums']["org_role"] | null,"organization_id"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "app_role"?: Database["public"]['Enums']["app_role"],"avatar_url"?: string | null,"created_at"?: string,"display_currency"?: string | null,"email"?: string,"format_locale"?: string,"full_name"?: string | null,"home_view"?: string,"id"?: string,"org_role"?: Database["public"]['Enums']["org_role"] | null,"organization_id"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "created_at": string,"created_by": string | null,"customer_id": string | null,"deadline": string | null,"delivery_city": string | null,"delivery_country": string,"id": string,"name": string,"notes": string | null,"organization_id": string,"reference_no": string | null,"status": Database["public"]['Enums']["project_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"customer_id"?: string | null,"deadline"?: string | null,"delivery_city"?: string | null,"delivery_country": string,"id"?: string,"name": string,"notes"?: string | null,"organization_id"?: string,"reference_no"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"customer_id"?: string | null,"deadline"?: string | null,"delivery_city"?: string | null,"delivery_country"?: string,"id"?: string,"name"?: string,"notes"?: string | null,"organization_id"?: string,"reference_no"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_organization_id_customer_id_fkey"
      columns: ["organization_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "projects_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"units": {
                  Row: {
                    "aliases": (string)[],"code": string,"dimension": string,"name": string,"sort_order": number,"to_base": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: (string)[],"code": string,"dimension": string,"name": string,"sort_order"?: number,"to_base"?: number | null
                  }
                  Update: {
                    "aliases"?: (string)[],"code"?: string,"dimension"?: string,"name"?: string,"sort_order"?: number,"to_base"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"worker_heartbeats": {
                  Row: {
                    "beat_at": string,"hostname": string,"queues": (string)[],"running_jobs": number,"started_at": string,"version": string | null,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "beat_at"?: string,"hostname": string,"queues"?: (string)[],"running_jobs"?: number,"started_at": string,"version"?: string | null,"worker_id": string
                  }
                  Update: {
                    "beat_at"?: string,"hostname"?: string,"queues"?: (string)[],"running_jobs"?: number,"started_at"?: string,"version"?: string | null,"worker_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invite":
{ Args: { "p_invite_id": string }; Returns: string
                           },
"auth_is_org_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"auth_org_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"auth_org_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["org_role"]
                           },
"change_member_role":
{ Args: { "p_org_role": Database["public"]['Enums']["org_role"],"p_user_id": string }; Returns: undefined
                           },
"convert_quantity":
{ Args: { "p_from": string,"p_quantity": number,"p_to": string }; Returns: number
                           },
"create_organization":
{ Args: { "p_country": string,"p_default_currency": string,"p_name": string }; Returns: string
                           },
"create_project":
{ Args: { "p_customer_id"?: string,"p_deadline"?: string,"p_delivery_city"?: string,"p_delivery_country"?: string,"p_name": string,"p_notes"?: string,"p_reference_no"?: string }; Returns: string
                           },
"custom_access_token_hook":
{ Args: { "event": Json }; Returns: Json
                           },
"delete_document":
{ Args: { "p_document_id": string }; Returns: string
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"delete_organization":
{ Args: { "p_confirm_name": string }; Returns: string
                           },
"duplicate_project":
{ Args: { "p_name"?: string,"p_project_id": string }; Returns: string
                           },
"estimate_credits":
{ Args: { "p_action": string,"p_scanned"?: boolean,"p_units": number }; Returns: number
                           },
"export_my_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"extract_document":
{ Args: { "p_document_id": string }; Returns: string
                           },
"invite_member":
{ Args: { "p_email": string,"p_org_role"?: Database["public"]['Enums']["org_role"] }; Returns: string
                           },
"is_super_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"leave_organization":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"my_organization_state":
{ Args: Record<PropertyKey, never>; Returns: {
              "deleted_at": string,"name": string,"org_role": Database["public"]['Enums']["org_role"],"organization_id": string,"purge_after": string,"status": string
            }[]
                           },
"my_pending_invites":
{ Args: Record<PropertyKey, never>; Returns: {
              "expires_at": string,"invite_id": string,"invited_by_name": string,"org_role": Database["public"]['Enums']["org_role"],"organization_name": string
            }[]
                           },
"org_activity":
{ Args: { "p_limit"?: number }; Returns: {
              "action": string,"actor_name": string,"id": number,"metadata": Json,"occurred_at": string,"target_type": string
            }[]
                           },
"ping_worker":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"register_document":
{ Args: { "p_file_name": string,"p_file_path": string,"p_project_id": string }; Returns: string
                           },
"remove_member":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"restore_organization":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"retry_document":
{ Args: { "p_document_id": string }; Returns: string
                           },
"revoke_invite":
{ Args: { "p_invite_id": string }; Returns: undefined
                           },
"transfer_ownership":
{ Args: { "p_user_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "user"|"super_admin","credit_bucket": "plan"|"topup","credit_entry": "grant"|"expire"|"reserve"|"refund"|"topup"|"adjustment","document_status": "uploaded"|"ready"|"extracting"|"extracted"|"failed","item_list_status": "needs_review"|"confirmed","job_status": "queued"|"running"|"succeeded"|"failed"|"cancelled","org_role": "owner"|"admin"|"member","project_status": "active"|"submitted"|"won"|"lost"|"archived"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["user", "super_admin"],"credit_bucket": ["plan", "topup"],"credit_entry": ["grant", "expire", "reserve", "refund", "topup", "adjustment"],"document_status": ["uploaded", "ready", "extracting", "extracted", "failed"],"item_list_status": ["needs_review", "confirmed"],"job_status": ["queued", "running", "succeeded", "failed", "cancelled"],"org_role": ["owner", "admin", "member"],"project_status": ["active", "submitted", "won", "lost", "archived"]
          }
        }
} as const

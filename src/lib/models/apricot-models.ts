// ===== OAuth Types =====

export interface OAuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

// ===== User Types =====

export interface UserAttributes {
  org_id: number;
  username: string;
  user_type: string;
  name_first: string;
  name_middle: string;
  name_last: string;
  login_attempts: number;
  mod_time: string;
  mod_user: number;
  active: number;
  password_reset: string;
  additionalProp1?: string;
  additionalProp2?: string;
  additionalProp3?: string;
}

export interface UserLinks {
  additionalProp1?: string;
  additionalProp2?: string;
  additionalProp3?: string;
}

export interface UserData {
  id: number;
  type: string;
  attributes: UserAttributes;
  links: UserLinks;
}

export interface UsersResponse {
  meta: {
    count: number;
  };
  data: UserData[];
}

export interface GetUsersOptions {
  pageSize?: number;
  pageNumber?: number;
  sort?: string;
  filters?: Record<string, string>;
}

// ===== Form Types =====

export interface FormAttributes {
  name: string;
  parent_id: number;
  description: string;
  active: number;
  creation_time: string;
  creation_user: string;
  mod_time: string;
  mod_user: string;
  sort_order: number;
  reference_tag: string;
  program_assignment_type: number;
  form_logic_enabled: number;
  guid: string;
  parent_guid: string;
}

export interface FormData {
  id: number;
  type: string;
  attributes: FormAttributes;
}

export interface FormsResponse {
  meta: {
    count: number;
  };
  data: FormData[];
}

export interface GetFormsOptions {
  pageSize?: number;
  pageNumber?: number;
  sort?: string;
  filters?: Record<string, string>;
}

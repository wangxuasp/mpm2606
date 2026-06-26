const VALID_USER = 'admin'
const VALID_PASS = 'admin'

export function validateCredentials(username: string, password: string): boolean {
  return username === VALID_USER && password === VALID_PASS
}

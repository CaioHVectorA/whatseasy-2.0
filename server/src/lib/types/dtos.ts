// DTOs

export type RegisterRequest = {
    email: string
    password: string,
    name: string
}

export type LoginRequest = {
    email: string
    password: string
}
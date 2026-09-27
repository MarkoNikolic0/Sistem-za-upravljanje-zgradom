export interface LoginResponse {
    access_token: string
}

export interface KorisnikResponse {
    id:number,
    ime:string,
    prezime: string,
    email: string,
    uloga: string,
    kreiranDatum: string
}
import { setCookie } from "@/lib/cookies"
import { useSearchParams } from "react-router-dom"

export const Callback = () => {
    const [sParams] = useSearchParams()
    const token = sParams.get('token')
    setCookie('token', token!, 30)
    window.location.href = '/'
    return <></>
}
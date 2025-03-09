import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { setCookie } from "@/lib/cookies"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"
const SetNameComponent = () => {
    const [name, setName] = useState('')
    return (
        <div className=" flex justify-center items-center h-screen flex-col">
            <h1 className=" mt-4 text-4xl">A última coisa!</h1>
            <h3 className="my-4 text-xl">Escolha um nome de usuário para o WhatsEasy</h3>
            <Input placeholder="Caio Henrique..." className=" w-fit text-2xl mb-4" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            <Button className=" text-2xl" size={'lg'} onClick={async () => {
                const res = await api.patch('/user/name', { name })
                if (res.status === 200) {
                    window.location.href = '/'
                }
            }}>Escolher esse nome</Button>
        </div>
    )
}
export const Callback = () => {
    const [sParams] = useSearchParams()
    const token = sParams.get('token')
    const newUser = sParams.get('new')
    if (!!newUser) {
        setCookie('token', token!, 30)
        return <SetNameComponent />
    } else {
        setCookie('token', token!, 30)
        window.location.href = '/'
        return <></>
    }
}
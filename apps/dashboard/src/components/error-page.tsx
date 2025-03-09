export function Error({ cause, children }: { cause: string, children?: React.ReactNode }) {
    return (
        <div className="flex items-center flex-col justify-center h-screen">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-red-500">Ocorreu um erro!</h1>
                <p className="text-lg text-gray-500">{cause}</p>
            </div>
            {children}
        </div>
    )
}
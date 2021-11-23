export async function sleep(t: number): Promise<null> {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(null)
        }, t)
    })
}

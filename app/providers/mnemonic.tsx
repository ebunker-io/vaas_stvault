import {createContext, ReactNode, useState} from 'react'

export interface mnemonicContextInterface {
    mnemonic: string
    onMnemonicChange?: (mnemonic: string) => void
}

export const MnemonicContext = createContext<mnemonicContextInterface>({mnemonic: ''})

export const MnemonicProvider = ({children}: {children: ReactNode}): JSX.Element => {
    const [mnemonic, setMnemonic] = useState('')

    const onMnemonicChange = (mnemonic: string) => setMnemonic(mnemonic)

    return <MnemonicContext.Provider value={{mnemonic: mnemonic, onMnemonicChange: onMnemonicChange}}>{children}</MnemonicContext.Provider>
}

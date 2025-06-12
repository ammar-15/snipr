type AppConfigType = {
    name: string,
    github: {
        title: string,
        url: string
    },
    author: {
        name: string,
        url: string
    },
}

export const appConfig: AppConfigType = {
    name: import.meta.env.VITE_APP_NAME ?? "Snipr",
    github: {
        title: "Snipr",
        url: "https://github.com/ammar-15/snipr",
    },
    author: {
        name: "Ammar",
        url: "https://github.com/ammar-15/",
    }
}

export const baseUrl = import.meta.env.VITE_BASE_URL ?? ""

import { useRouter } from "next/router";
import { useConfig } from "nextra-theme-docs";

export default {
    logo: <span>Bagman</span>,
    docsRepositoryBase: 'https://github.com/sheunglaili/bagman/tree/main/docs',
    project: {
        link: 'https://github.com/sheunglaili/bagman',
    },
    // look into https://github.com/garmeeh/next-seo#add-seo-to-page
    // for future configuration for SEO
    useNextSeoProps() {
        return {
            titleTemplate: '%s - Bagman'
        };
    },
    head: () => {
        const { asPath } = useRouter()
        const { frontMatter } = useConfig()
        return <>
            <meta property="og:url" content={`https://sheunglaili.github.com/bagman/${asPath}`} />
            <meta property="og:title" content={frontMatter.title || 'Bagman'} />
            <meta property="og:description" content={frontMatter.description || 'Powering hassle-free, real-time communication'} />
        </>
    },
    footer: {
        text: <span>
            MIT {new Date().getFullYear()} © <a href="https://sheunglaili.github.com/bagman" target="_blank">Bagman</a>.
        </span>,
    }
}
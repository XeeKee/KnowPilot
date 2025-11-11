const DEMO_CONFIG = {
    // Pre-determined outline
    outline: `
## Overview  
`,
    
    // Pre-determined article content
    articles: [
        {
            "title": "Overview",
            "content": `The Jiangsu City Football League, locally known as the \"Su Super League,\" has emerged as an **unexpected commercial and cultural phenomenon** in East China's Jiangsu Province[1]. Despite being an amateur competition featuring 13 city-based teams, the tournament has **drawn larger crowds than many professional league matches** since its kickoff on May 10[2]. Over the past month, the league has transformed into a **commercial juggernaut**, demonstrating the **growing popularity of grassroots football** in the region. The tournament's success highlights the strong local enthusiasm for football, with community support rivaling that of top-tier professional competitions. This amateur league's rapid rise underscores the potential for regional football initiatives to capture public interest and commercial viability[3].`,
             "references": {
                "1": {
                    "content": "When the final whistle blew at Zhenjiang Sports and Exhibition Center on May 10, launching the inaugural Jiangsu Football City League (JSCL) in eastern China, few anticipated the provincial amateur tournament would ignite China's latest sports phenomenon.",
                    "title": "Xinhua Headlines: Derby Fever: How Jiangsu's amateur football league captivates China with sibling rivalry",
                    "url": "https://english.news.cn/20250607/dbceee9267e447f1a6763079a0f93dcf/c.html"
                },
               "2": {
                    "content": "On the sweltering night of July 5, with temperatures hitting a scorching 40 degrees Celsius, a record 60,396 fans erupted in roars as two teams fought tooth and nail... The league features amateur teams from 13 cities in Jiangsu Province... The season runs from May to November... That week, the league drew an average crowd of over 39,000 per game, rivaling the English Premier League and Bundesliga.",
                    "title": "How a $1 football ticket offers a front-row seat to China's economy? - City News Service",
                    "url": "https://www.citynewsservice.cn/news/How-a-$1-football-ticket-offers-a-front-row-seat-to-China's-economy--amyy6g6m"
                },
                "3": {
                    "content": "'Su Chao' Fever: China's Local Football League Becomes a National Sensation and Economic Driver. JSCL, consisting of 13 teams from Jiangsu's cities, is unique in that it allows both professional and amateur players. The event runs from May 10 to November 2 and features 85 matches held in various cities. It is a football competition and a major catalyst for boosting local consumption and tourism.",
                    "title": "'Su Chao' Fever: China's Local Football League Becomes a National Sensation and Economic Driver | ichongqing",
                    "url": "https://www.ichongqing.info/2025/07/03/su-chao-fever-chinas-local-football-league-becomes-a-national-sensation-and-economic-driver/"
                }
            }
        }
    ],
    
    // Demo settings
    settings: {
        articleTitle: "Jiangsu Provincial City Football League",
        generateDelay: 1500, 
        chapterDelay: [2000, 3000], 
        showNotifications: true
    }
};

// Oceanographic Research Demo Configuration
const OCEANOGRAPHIC_DEMO_CONFIG = {
    // Preset outline
    outline: `
## Formation and Geological Controls
## Environmental Conditions for Shallow Gas Hydrate Stability  
## Sediment Types and Biogeochemical Factors   
## Distribution in Continental Margins and Shelf Slopes  
## Exploration and Detection Methods
`,
    
    // Preset article content
    
    articles: [
        {
            "title": "Formation and Geological Controls",
            "content": `Marine shallow gas hydrate accumulations exhibit diverse geological characteristics and formation mechanisms across different regions, as evidenced by discoveries in the South China Sea, Ulleung Basin, and Barents Sea. In the Dongsha area of the South China Sea, drilling has revealed all known types of shallow hydrate occurrences, while the Qiongdongnan Cold Seep displays key exploration indicators including pockmarks, gas chimneys, methane plumes, and cold seep carbonates[1]. These shallow hydrate systems share common controlling factors with deeper hydrate and conventional hydrocarbon systems, particularly regarding gas source composition, migration pathways, and reservoir conditions. However, their **unique accumulation environments are influenced by regional tectonic settings and depositional processes**.\n\nThe Ulleung Basin presents a distinct shallow hydrate system where hydrates fill pore fractures in blocky and dispersed forms, primarily sourced from microbial gas. In contrast, the Barents Sea features shallow hydrates occurring as blocky, vein-like, and disseminated crystals within fine-grained sediments, with thermogenic gas as the dominant source. A notable example is the Håkon Mosby mud volcano, where shallow hydrates near the seafloor appear as white to grayish-white veins and rounded masses filling fissures, derived from a mixed thermogenic and microbial gas source. These systems demonstrate how **gas migration mechanisms (e.g., mud volcanoes, fractures) and sediment composition influence hydrate morphology and distribution**[2].\n\nShallow hydrates occupy a **critical transition zone between stable and unstable states**, making them **highly sensitive to environmental changes** such as tectonic activity, sea-level fluctuations, and tidal stress. This sensitivity not only poses potential submarine geohazards but also highlights their role in global climate dynamics due to methane release risks[3]. The varied geological settings and gas sources observed in shallow hydrate systems underscore the need for multidisciplinary research to better understand their accumulation patterns and environmental implications.`,
            "references": {
                "1": {
                    "content": "The 3D seismic data acquired in the central Qiongdongnan Basin, northwestern South China Sea, reveal the presence of shallow gas hydrate, free gas, and focused fluid flow in the study area, which are indicated by multiple seismic anomalies, including bottom simulating reflectors, polarity reverses, pulldowns... A new cold seep is also discovered at approximately 1520 m water depths with an ~40 m wide crater.",
                    "title": "Shallow gas accumulation mechanism in the Qiongdongnan Basin, South China Sea",
                    "url": "https://www.researchgate.net/publication/390005715_Shallow_gas_accumulation_mechanism_in_the_Qiongdongnan_Basin_South_China_Sea"
                },
                "2": {
                    "content": "The accumulation and distribution of gas hydrates are closely related to the gas and fluid migration which is primarily controlled by the structures in shallow marine sediments.",
                    "title": "Structures in Shallow Marine Sediments Associated with Gas and Fluid Migration - MDPI",
                    "url": "https://www.mdpi.com/2077-1312/9/4/396"
                },
                "3": {
                    "content": "Methane deposits in permafrost and hydrates are considered to be very sensitive in the expansive shallow-shelf regions, because with the relatively low pressures it would only take a small temperature change to release large amounts of methane.",
                    "title": "Climate change and methane hydrates - World Ocean Review",
                    "url": "https://worldoceanreview.com/en/wor-1/ocean-chemistry/climate-change-and-methane-hydrates/"
                }
            }
        },
        {
            "title": "Environmental Conditions for Shallow Gas Hydrate Stability",
            "content": `Natural gas hydrates are crystalline, ice-like structures composed of water molecules forming cage-like lattices that trap small gas molecules such as methane and ethane. These compounds form under **specific low-temperature and high-pressure conditions**, predominantly occurring in permafrost regions and marine continental slope sediments[1]. As a potential clean energy resource with vast global reserves, gas hydrates have drawn significant scientific and industrial interest due to their dual role in energy supply and the global carbon cycle.\n\nThe formation of shallow marine hydrates is fundamentally controlled by hydrocarbon gas availability, particularly methane. Current research indicates three key mechanisms governing hydrate formation: methane dissolution in pore water, maintenance of methane supersaturation, and subsequent hydrate nucleation and crystal growth. A critical requirement is the **presence of a high-flux gas supply** beneath the hydrate stability zone to sustain methane concentrations above saturation levels. When dissolved methane exceeds the critical threshold for diffusive transport and persists under suitable thermobaric conditions, stable hydrate formation occurs. This high-flux gas not only ensures continuous methane input but also **accelerates hydrate nucleation kinetics**, enhancing both formation rates and long-term stability.\n\nIn high methane flux environments, a **\"composite accumulation model\" emerges**, where shallow and mid-depth hydrate systems coexist through combined diffusive and advective (leakage) gas transport mechanisms. This creates spatially superimposed hydrate reservoirs with complex distribution patterns[2]. However, key knowledge gaps remain regarding fluid migration dynamics through faults, fractures, and diapiric structures, which critically connect deep gas sources with shallow hydrate formation zones. Understanding these **structural controls on gas flux partitioning** between diffusion-dominated and leakage-dominated systems represents a pivotal research frontier for both resource development and geohazard assessment. The interplay between these transport mechanisms ultimately dictates the spatial heterogeneity, saturation, and stability of shallow hydrate accumulations.`,
            "references": {
                "1": {
                    "content": "The gas hydrates formation occurs under certain thermobaric conditions, with the availability of a gas hydrate-forming agent... The important role in the process of natural gas hydrates formation is assigned to thermobaric parameters, as well as to the properties and features of the geological environment.",
                    "title": "Peculiarities of geological and thermobaric conditions for the gas hydrate deposits occurence in the Black Sea and the prospects for their development",
                    "url": "https://cyberleninka.ru/article/n/peculiarities-of-geological-and-thermobaric-conditions-for-the-gas-hydrate-deposits-occurence-in-the-black-sea-and-the-prospects"
                },
                "2": {
                    "content": "This paper presents a new constitutive model that simulates the mechanical behavior of methane hydrate-bearing soil based on the concept of critical state soil mechanics... By assuming deformable porous media (soil matrix) that accommodate non-movable but dissociable hydrate, a two-phase flow formulation of water and methane gas is suggested according to Darcy’s law and capillary pressure law.",
                    "title": "COMPOSITE MODEL TO REPRODUCE THE MECHANICAL RESPONSE OF GAS HYDRATE BEARING SOILS | Request PDF",
                    "url": "https://www.researchgate.net/publication/284726739_COMPOSITE_MODEL_TO_REPRODUCE_THE_MECHANICAL_RESPONSE_OF_GAS_HYDRATE_BEARING_SOILS"
                }
            }
        },
        {
            "title": "Sediment Types and Biogeochemical Factors",
            "content": `Shallow marine gas hydrate reservoirs exhibit distinct sedimentological and structural characteristics that differ significantly from deeper hydrate systems. These reservoirs typically occur in deep-water continental slope environments where fine-grained sediments dominate, yet they **preferentially accumulate within coarser-grained sedimentary features** such as turbidite fans, slope fans, contourite deposits, and channel systems[1]. These depositional environments provide particularly favorable conditions due to their higher sedimentation rates, larger grain sizes, and elevated organic carbon content compared to surrounding sediments. The presence of abundant foraminiferal tests in shallow seafloor sediments creates a **dual porosity system** - both interparticle pores between sediment grains and intraparticle pores within microfossil tests. These biogenic pores often exceed the size of intergranular spaces, creating additional void volume for hydrate accumulation. This unique pore structure makes shallow sediments more conducive to hydrate enrichment than mid-depth deposits.\n\nThe morphology and distribution of shallow hydrates vary considerably across different geological settings. In the Ulleung Basin, hydrates occur as blocky and dispersed masses filling pore spaces and fractures, with microbial methane as the primary gas source. This contrasts with the Barents Sea system where hydrates form as blocky, vein-like, and disseminated crystals within fine-grained sediments, predominantly sourced from thermogenic gas. The Håkon Mosby mud volcano represents a particularly important end-member, where hydrates appear as white to grayish-white veins and rounded masses filling near-seafloor fissures. This system demonstrates **mixed gas sourcing, with both thermogenic and microbial methane contributing** to hydrate formation. The mud volcano serves as the primary conduit for vertical gas migration in this setting.\n\nMicrobial methane generation in shallow hydrate systems occurs through two principal pathways: carbon dioxide reduction and acetate fermentation. The former process depends on dissolved hydrogen availability while the latter is constrained by acetate concentrations. Since **microbial methane production derives from in situ organic matter degradation**, the quantity of generated gas directly relates to sediment organic content. Notable examples of microbial hydrate systems include the Blake Ridge, Ulleung Basin, and Japan's Nankai Trough[2]. These systems typically exhibit more diffuse hydrate distributions compared to thermogenic systems, reflecting the broader dispersion of microbial methane generation throughout the sediment column.`,
            "references": {
                "1": {
                    "content": "On continental margins, high saturation gas hydrate systems (>60% pore volume) are common in canyon and channel environments within the gas hydrate stability zone, where reservoirs are dominated by coarse-grained, high porosity sand deposits. Recent studies... suggest that rapidly deposited, silt-dominated channel-levee environments can also host high saturation gas hydrate accumulations.",
                    "title": "Sedimentology and stratigraphy of a deep-water gas hydrate reservoir in the northern Gulf of Mexico | Request PDF",
                    "url": "https://www.researchgate.net/publication/344030074_Sedimentology_and_stratigraphy_of_a_deep-water_gas_hydrate_reservoir_in_the_northern_Gulf_of_Mexico"
                },
                "2": {
                    "content": "Microbial gas is formed at low temperature (usually <75°C) via biogeochemical processes in subsurface sediments, while thermogenic gases generated from pyrolysis of organic matter usually occur at high temperatures (usually >150°C).",
                    "title": "Geochemical characteristics of gases associated with natural gas hydrates",
                    "url": "https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2022.968647/full"
                }
            }
        },
        {
            "title": "Distribution in Continental Margins and Shelf Slopes",
            "content": `The formation and distribution of shallow marine gas hydrates are **fundamentally controlled by regional tectonic structures** that govern fluid migration pathways. In the Manila Trench system, contrasting structural regimes between northern and southern sectors create distinct hydrate accumulation patterns. The northern region features imbricate thrust faults that channel deep-sourced gases into shallow marine sediments... Conversely, the southern sector's normal fault systems serve as more efficient fluid conduits, evidenced by more continuous BSR distributions. This **structural dichotomy demonstrates how variations in fault geometry (thrust vs. normal) can significantly influence shallow hydrate enrichment** processes through differential fluid flux regulation[1].\n\nActive mud volcano systems represent another critical tectonic control, as exemplified by the Håkon Mosby structure in the Barents Sea. These features create **focused vertical migration pathways** for both thermogenic and microbial gases, producing characteristic near-seafloor hydrate manifestations as white to grayish-white vein networks and rounded masses within fissures. The Ulleung Basin presents an alternative structural setting where microbial-sourced hydrates preferentially fill fracture networks in blocky and dispersed morphologies, highlighting how basin-specific deformation styles influence hydrate habit.\n\nThe South China Sea reveals the complex interplay between tectonics and hydrate formation through its diverse shallow occurrences. The Dongsha area contains all known hydrate types, while the Qiongdongnan Cold Seep system displays diagnostic features including pockmarks, gas chimneys, and methane plumes[2]. These systems demonstrate that while shallow hydrates exhibit unique local characteristics, their accumulation remains governed by universal factors: gas source composition, migration pathway efficiency, and reservoir quality. Regional similarities in tectonic environments and depositional histories suggest that comparative studies across basins could reveal fundamental controls on shallow hydrate distribution. Current research gaps particularly concern how **fault zone architecture... modulates the transition between diffusion-dominated and advection-dominated gas transport systems** - a key factor controlling hydrate saturation and spatial heterogeneity in shallow settings.`,
            "references": {
                "1": {
                    "content": "The Manila Trench, with its unique subduction characteristics and complex tectonic deformation resulting from the subduction of the transitional and oceanic crusts of the South China Sea, is crucial for understanding the evolution of the South China Sea.",
                    "title": "Flexural modeling of the Manila Trench based on subduction dip: comparison of north-south subduction differences - Frontiers",
                    "url": "https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2025.1548688/full"
                },
                "2": {
                    "content": "Gas hydrates are typically found in the fine-grained sediments with low abundance and strong heterogeneity in the northern South China Sea... Faults, gas chimneys, and shallow fractures act as efficient pathways for the migration of geofluids from deep formations to shallow layers.",
                    "title": "Potential on joint development of three-gas reservoirs in the Qiongdongnan Basin",
                    "url": "https://www.the-innovation.org/article/doi/10.59717/j.xinn-geo.2024.100065"
                }
            }
        },
        {
            "title": "Exploration and Detection Methods",
            "content": `Shallow marine gas hydrate research faces **significant scientific and technological challenges** compared to more established mid-depth hydrate studies. Fundamental knowledge gaps persist regarding formation mechanisms, global distribution patterns, and basic physical properties of shallow systems, lacking both comprehensive theoretical frameworks and robust empirical datasets. Current exploration technologies, originally designed for mid-depth hydrates, **prove inadequate for shallow reservoir characterization**, creating an urgent need for specialized detection and evaluation systems[1]. The South China Sea case studies reveal this complexity - while the Dongsha area contains all known hydrate types and the Qiongdongnan Cold Seep displays diagnostic features like pockmarks and gas chimneys, each system's unique geological context requires tailored investigation approaches.\n\nTechnical challenges extend to extraction methodologies, where shallow hydrate production remains in early developmental stages. Unique obstacles include **maintaining reservoir stability during extraction, managing potential seabed subsidence risks**, and addressing the dynamic nature of shallow hydrate stability zones. Environmental concerns compound these technical difficulties, particularly regarding methane leakage prevention and ecological impact mitigation in sensitive cold seep ecosystems. The interconnected nature of shallow hydrate systems with surface expressions like methane plumes and carbonate crusts demands integrated monitoring solutions that can track both subsurface reservoirs and seafloor manifestations.\n\n**Interdisciplinary collaboration deficits** currently hinder progress, exacerbated by insufficient data sharing platforms and inconsistent monitoring standards across research programs. Economic constraints further limit technological innovation, while evolving policy frameworks struggle to balance resource development with environmental protection mandates. Future research priorities should focus on establishing international cooperative networks, developing next-generation exploration technologies, and creating standardized protocols for environmental impact assessments[2]. Parallel efforts must address the socioeconomic dimensions of shallow hydrate development through stakeholder engagement and adaptive management frameworks that can accommodate emerging scientific understanding while supporting responsible resource utilization.`,
            "references": {
                "1": {
                    "content": "The exploration for gas hydrates is challenging due to the complex geology of gas hydrate-bearing sediments. The presence of free gas, water, and other minerals can complicate the interpretation of geophysical data. Additionally, the resolution and accuracy of geophysical techniques can be limited, making it difficult to quantify gas hydrate deposits.",
                    "title": "Unlocking Gas Hydrates through Geophysical Exploration - Number Analytics",
                    "url": "https://www.numberanalytics.com/blog/geophysical-exploration-gas-hydrates-ultimate-guide"
                },
                "2": {
                    "content": "Therefore, these model-driven hydrate reservoir identification methods have the problems of difficult identification, low accuracy, and low processing efficiency. At the same time, they are also vulnerable to human factors and a complex geological environment.",
                    "title": "Research on Reservoir Identification of Gas Hydrates ... - MDPI",
                    "url": "https://www.mdpi.com/2077-1312/13/7/1208"
                }
            }
        }
    ],
    
    // Demo settings
    settings: {
        articleTitle: "Marine Shallow Gas Hydrate Accumulation Systems",
        generateDelay: 1500, // Delay after outline display before article generation (milliseconds)
        chapterDelay: [2000, 3000], // Chapter generation time range (milliseconds)
        showNotifications: true
    }
};

// Industrial Report Demo Configuration
const INDUSTRIAL_DEMO_CONFIG = {
    // Preset outline
    outline: `
## Introduction
## Historical Evolution
## Major Industrial Sectors
## Current Trends and Innovations
## Challenges and Future Outlook
`,
    
    // Preset article content
    articles: [
        {
            "title": "Introduction",
            "content": "Kimia Farma has implemented **strategic supplier oversight** to ensure the safety and reliability of recyclable product materials. This vertical integration strategy aims to gain ownership or increased control over suppliers, particularly effective when facing conditions such as limited suppliers in a competitive market, stable supply chains, consistent pricing, and suppliers with high-profit margins. The company's ability to execute this approach is supported by its strong capital base and quality resources. The pharmaceutical industry in Indonesia faces significant challenges, including **intense internal competition and reduced public purchasing power** due to economic crises, which threaten the sustainability of national pharmaceutical companies[1]. Kimia Farma has responded with strategic initiatives, including a planned **rights issue to fund the acquisition of public shares in Indofarma**. This move is expected to strengthen Kimia Farma's market position without altering its core business strategy[2]. Additionally, Kimia Farma holds shares in **PT Sinkona Indonesia Lestari (SIL)**, a company operating in Subang, West Java, which further diversifies its business interests[3]. The company's strategic decisions, including supplier control and acquisitions, reflect its focus on long-term stability and growth in a competitive pharmaceutical landscape.",
            "references": {
                "1": {
                    "content": "The Indonesian pharmaceutical industry came under scrutiny in mid-2024 when it was revealed the price of certain medicines was four times cheaper in Malaysia and lower in many neighbouring countries... Currently, up to 90 percent of finished product ingredients needed for pharmaceuticals are imported. This has added to the price strain.",
                    "title": "Indonesian Pharmaceutical Industry Finds Itself at a Critical Crossroads - Asian Insiders",
                    "url": "https://asianinsiders.com/2025/01/28/indonesian-pharmaceutical-industry-2025-outlook/"
                },
                "2": {
                    "content": "Regrouping pharmaceutical companies in Indonesia among PT. Kimia Farma (Persero) Tbk and PT. Indofarma (Persero) Tbk will be carried out by the government through inbreng scheme. In order to take acquisitions, a fair price must be counted for, so the public interests not be harmed.",
                    "title": "PENILAIAN HARGA WAJAR SAHAM PT.KIMIA FARMA (PERSERO) Tbk DAN PT. INDOFARMA (PERSERO) Tbk MENJELANG AKUISISI",
                    "url": "https://publikasi.mercubuana.ac.id/index.php/Jurnal_Mix/article/view/83"
                },
                "3": {
                    "content": "PT Sinkona Indonesia Lestari (PT SIL) is a company that produces Quinine salt and its derivatives to be supplied to many industries worldwide, especially for pharmaceuticals, beverages, and chemical industries... The composition of shareholders is 59,99% PT Kimia Farma Tbk...",
                    "title": "Subsidiary - Kimia Farma",
                    "url": "https://www.kimiafarma.co.id/en/subsidiary"
                }
            }
        },
        {
            "title": "Historical Evolution",
            "content": "Kimia Farma has pursued **strategic expansion through acquisitions and partnerships** to strengthen its market position in Indonesia's pharmaceutical industry. A key initiative involves the planned **acquisition of public shares in Indofarma**, which is expected to create synergies without disrupting Kimia Farma's existing business strategy[1]. To finance this move, the company has engaged in a **rights issue to raise capital**, supporting the takeover while potentially boosting Kimia Farma's sales performance[2].\n\nThe company also maintains diversified investments through its **ownership stake in PT Sinkona Indonesia Lestari (SIL)**, located in Subang, West Java. This subsidiary operates in a green tea plantation area owned by PTPN VIII, reflecting Kimia Farma's broader business interests beyond pharmaceuticals[3]. These strategic moves align with industry trends of vertical integration and portfolio diversification to enhance competitiveness in Indonesia's evolving healthcare landscape, particularly in anticipation of **national health insurance system (SJSN-BPJS) reforms**. References to Porter's competitive strategy framework suggest Kimia Farma's approach considers both upstream and downstream value chain optimization to maintain market leadership.",
            "references": {
                "1": {
                    "content": "Kimia Farma this week said it would merge with competitor Indofarma as part of a plan by the government to consolidate and strengthen the sector. Adrianus Bias Prasuryo, a senior analyst at Ciptadana Securities, told Reuters that Indofarma has a stronger manufacturing operation, while Kimia brings a broader distribution network to the table.",
                    "title": "Indonesia's Indofarma combines its manufacturing expertise with Kimia's supply chain strength | Fierce Pharma",
                    "url": "https://www.fiercepharma.com/partnering/indonesia-s-indofarma-combines-its-manufacturing-expertise-kimia-s-supply-chain-strength"
                },
                "2": {
                    "content": "INA and SRF have officially become the strategic investor of KAEF and KFA by subscribing to KAEF MCB (mandatory convertible bonds) rights offering and acquiring a 40% shares in its subsidiary, KFA.",
                    "title": "INA and SRF Announce Investments in KAEF and KFA - Kimia Farma",
                    "url": "https://www.kimiafarma.co.id/en/read/ina-and-srf-announce-investments-in-kaef-and-kfa"
                },
                "3": {
                    "content": "PT Sinkona Indonesia Lestari (PT SIL) is a company that produces Quinine salt and its derivatives... The composition of shareholders is 59,99% PT Kimia Farma Tbk...",
                    "title": "Subsidiary - Kimia Farma",
                    "url": "https://www.kimiafarma.co.id/en/subsidiary"
                }
            }
        },
        {
            "title": "Major Industrial Sectors",
            "content": "PT Kimia Farma (Persero) Tbk operates as a state-owned pharmaceutical enterprise with **diversified business activities** spanning chemical and pharmaceutical manufacturing, research and development, trading and distribution networks, healthcare services through retail pharmacy chains, and asset management[1]. As one of Indonesia's government-owned pharmaceutical manufacturers, the company maintains three key subsidiaries, including **PT Kimia Farma Trading and Distribution**, which plays a critical role in ensuring nationwide medicine distribution. This subsidiary handles both Kimia Farma's proprietary products and principal-branded pharmaceuticals, addressing the logistical challenges of serving Indonesia's vast archipelago while creating revenue growth opportunities[2].\n\nThe company has adopted **backward integration strategies to strengthen supply chain control**, particularly when suppliers become unreliable due to delays, declining material quality, or rising costs. This vertical integration approach aligns with growing consumer demand for environmentally friendly and recyclable products. By increasing oversight of raw material sourcing and production processes, Kimia Farma enhances both operational reliability and sustainability credentials in Indonesia's competitive pharmaceutical market. The company's **integrated business model—combining manufacturing, distribution, and retail**—positions it to capitalize on Indonesia's expanding healthcare needs while mitigating supply chain vulnerabilities.",
            "references": {
                "1": {
                    "content": "PT Kimia Farma Tbk is a healthcare company with an integrated upstream to downstream businesses in Indonesia. A member of the Bio Farma Group, PT Kimia Farma Tbk has several main business fields including manufacturing, distribution, marketing & retail, and other supporting services.",
                    "title": "About Us - Kimia Farma",
                    "url": "https://www.kimiafarma.co.id/en/about-us"
                },
                "2": {
                    "content": "PT Kimia Farma Trading & Distribution (KFTD) is a subsidiary of PT Kimia Farma Tbk which was established on January 4, 2003, and has a role as a provider of distribution and trading services for health products.",
                    "title": "Subsidiary - Kimia Farma",
                    "url": "https://www.kimiafarma.co.id/en/subsidiary"
                }
            }
        },
        {
            "title": "Current Trends and Innovations",
            "content": "Kimia Farma has adopted **backward integration as a key strategy** to strengthen control over raw material suppliers, particularly in response to **unreliable supply chains** marked by delays, declining quality, and rising costs. This approach aligns with **growing consumer demand for environmentally sustainable** and recyclable pharmaceutical products, prompting the company to prioritize oversight of eco-friendly material sourcing[1]. The strategy proves most effective in markets with limited suppliers but high competition, where stable pricing and supplier profitability allow for greater vertical integration—provided the company has sufficient capital and quality resources to execute such moves.\n\nThe Indonesian pharmaceutical sector faces significant challenges, including **intense domestic competition and reduced public purchasing power** due to economic crises, threatening the viability of local drug manufacturers. In response, Kimia Farma is pursuing **strategic acquisitions, such as its planned takeover of Indofarma’s public shares**, funded through a rights issue. This move aims to enhance sales synergies without disrupting core operations, reflecting broader industry consolidation trends[2]. Porter’s TOWS analysis underscores these external pressures, highlighting how companies must balance threats like economic downturns with opportunities in supply chain optimization and market expansion.",
            "references": {
                "1": {
                    "content": "Currently, up to 90 percent of finished product ingredients needed for pharmaceuticals are imported. This has added to the price strain. The government has attempted to address this with a policy designed to encourage domestic production of raw materials.",
                    "title": "Indonesian Pharmaceutical Industry Finds Itself at a Critical Crossroads - Asian Insiders",
                    "url": "https://asianinsiders.com/2025/01/28/indonesian-pharmaceutical-industry-2025-outlook/"
                },
                "2": {
                    "content": "The purpose of this study is to analyze the effect of merger and acquisition announcements on stock prices and trading volume activity. The research method used is an event study. The results showed that there was a significant negative abnormal return on the day of the announcement of the merger and acquisition of PT. Kimia Farma Tbk with PT. Indofarma Tbk.",
                    "title": "Analysis of Market Reaction to Merger and Acquisition Announcement of PT. Kimia Farma Tbk with PT. Indofarma Tbk",
                    "url": "https://jurnal.pancabudi.ac.id/index.php/jurnalfasosa/article/view/1066"
                }
            }
        },
        {
            "title": "Challenges and Future Outlook",
            "content": "Kimia Farma's **strategic acquisition of Indofarma** through a rights issue demonstrates its commitment to market consolidation without disrupting core operations, signaling a future focus on synergistic growth[1]. The company's investment in PT Sinkona Indonesia Lestari—located in PTPN VIII's tea plantation area in Subang—reflects a **diversification strategy beyond pharmaceuticals**, potentially creating new revenue streams. Industry analysts anticipate these moves will strengthen Kimia Farma's position as Indonesia prepares for **healthcare system reforms under SJSN-BPJS**, where integrated supply chains and economies of scale will prove critical[2].\n\nReferences to Porter's competitive strategy framework suggest the company is likely to continue **optimizing both upstream (raw material control) and downstream (distribution network) operations**. This dual approach, combined with strategic partnerships and eco-conscious product development, positions Kimia Farma to navigate Indonesia's evolving pharmaceutical landscape—balancing economic pressures with opportunities in healthcare accessibility and sustainable manufacturing. Future success may hinge on **executing these vertical integration strategies** while adapting to regulatory changes and shifting consumer preferences.",
            "references": {
                "1": {
                    "content": "Kimia Farma this week said it would merge with competitor Indofarma as part of a plan by the government to consolidate and strengthen the sector. Adrianus Bias Prasuryo, a senior analyst at Ciptadana Securities, told Reuters that Indofarma has a stronger manufacturing operation, while Kimia brings a broader distribution network to the table.",
                    "title": "Indonesia's Indofarma combines its manufacturing expertise with Kimia's supply chain strength | Fierce Pharma",
                    "url": "https://www.fiercepharma.com/partnering/indonesia-s-indofarma-combines-its-manufacturing-expertise-kimia-s-supply-chain-strength"
                },
                "2": {
                    "content": "The implementation of the National Health Insurance (JKN) by the Health Social Security Administering Body (BPJS) has had a significant impact on the pharmaceutical business in Indonesia. The JKN program has increased access to healthcare services for the Indonesian population, which has led to an increase in demand for pharmaceutical products.",
                    "title": "The Impact of the National Health Insurance Program on the Pharmaceutical Business in Indonesia",
                    "url": "https://www.researchgate.net/publication/368898955_The_Impact_of_the_National_Health_Insurance_Program_on_the_Pharmaceutical_Business_in_Indonesia_A_Qualitative_Study"
                }
            }
        }
    ],
    
    // Demo settings
    settings: {
        articleTitle: "Kimia Farma",
        generateDelay: 1500, // Delay after outline display before article generation (milliseconds)
        chapterDelay: [2000, 3000], // Chapter generation time range (milliseconds)
        showNotifications: true
    }
};

// Export configuration objects
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEMO_CONFIG, OCEANOGRAPHIC_DEMO_CONFIG };
} else if (typeof window !== 'undefined') {
    window.DEMO_CONFIG = DEMO_CONFIG;
    window.OCEANOGRAPHIC_DEMO_CONFIG = OCEANOGRAPHIC_DEMO_CONFIG;
    window.INDUSTRIAL_DEMO_CONFIG = INDUSTRIAL_DEMO_CONFIG;
} 
import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:8080", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Click on the 'Sign in' button to proceed to login.
        frame = context.pages[-1]
        # Click on the 'Sign in' button to go to the login page.
        elem = frame.locator('xpath=html/body/div/div[2]/nav/div/div/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input email and password, then click the 'Sign in' button to authenticate.
        frame = context.pages[-1]
        # Input email address
        elem = frame.locator('xpath=html/body/div/div[2]/div/div[2]/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('lsnetinformatica2024@gmail.com')
        

        frame = context.pages[-1]
        # Input password
        elem = frame.locator('xpath=html/body/div/div[2]/div/div[2]/div[2]/form/div[2]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Luiyi260879@')
        

        frame = context.pages[-1]
        # Click the 'Sign in' button to submit login form
        elem = frame.locator('xpath=html/body/div/div[2]/div/div[2]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Locate and open the API testing or instance creation interface to send a POST request with valid parameters for WhatsApp instance creation.
        frame = context.pages[-1]
        # Click the 'Nuevo Agente' button to start creating a new agent instance.
        elem = frame.locator('xpath=html/body/div/div[2]/div/main/div/div[4]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click the 'Crear Agente' button to open the new agent creation form.
        frame = context.pages[-1]
        # Click the 'Crear Agente' button to start creating a new WhatsApp instance.
        elem = frame.locator('xpath=html/body/div/div[2]/div/main/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input company name using a different method or skip and continue filling other fields, then proceed to submit the form.
        frame = context.pages[-1]
        # Retry inputting company name with a different approach
        elem = frame.locator('xpath=html/body/div/div[2]/div/main/div/div[3]/div[2]/div[3]/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Mi Empresa S.A.')
        

        # -> Fill in the remaining required fields with valid data and click the 'Siguiente' button to proceed.
        frame = context.pages[-1]
        # Input agent description
        elem = frame.locator('xpath=html/body/div/div[2]/div/main/div/div[3]/div[2]/div/div[3]/textarea').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Agente para soporte y atención vía WhatsApp.')
        

        frame = context.pages[-1]
        # Input company website
        elem = frame.locator('xpath=html/body/div/div[2]/div/main/div/div[3]/div[2]/div[3]/div/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('https://www.miempresa.com')
        

        frame = context.pages[-1]
        # Input company description
        elem = frame.locator('xpath=html/body/div/div[2]/div/main/div/div[3]/div[2]/div[3]/div[2]/textarea').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Empresa dedicada a brindar soporte técnico y atención al cliente.')
        

        frame = context.pages[-1]
        # Input main products or services
        elem = frame.locator('xpath=html/body/div/div[2]/div/main/div/div[3]/div[2]/div[3]/div[3]/textarea').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Soporte técnico, atención al cliente, consultoría')
        

        frame = context.pages[-1]
        # Click the 'Siguiente' button to proceed to the next step of agent creation
        elem = frame.locator('xpath=html/body/div/div[2]/div/main/div/div[3]/div[2]/div[4]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click the 'Ver Planes' button to review upgrade options or explore alternative ways to test the WhatsApp instance creation API endpoint.
        frame = context.pages[-1]
        # Click the 'Ver Planes' button to view subscription plans and upgrade options.
        elem = frame.locator('xpath=html/body/div/div[2]/div/main/div/div[3]/div[2]/div/div[3]/textarea').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Crear Nuevo Agente').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Configura tu nuevo agente IA conversacional').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Información Básica').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Nombre del Agente *').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Descripción del Agente').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Nombre de la Empresa *').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Sitio Web (opcional)').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=¿A qué se dedica tu empresa? *').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Productos o Servicios Principales').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Público Objetivo').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Atrás').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Siguiente').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    
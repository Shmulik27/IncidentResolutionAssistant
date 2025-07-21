describe('Scheduled Log Scan Jobs E2E', () => {
  beforeEach(() => {
    // Reset to a clean state before each test
    cy.visit('/');
  });

  it('User can create, see, and delete a scheduled job and see incidents', () => {
    // Visit the log scanner page
    cy.visit('/log-scanner');

    // Open the job creation form
    cy.contains('Create New Job').click();
    // Fill out and submit the job creation form
    cy.get('input[name="name"]').type('E2E Cypress Job');
    cy.get('select[name="namespace"]').select('default');
    cy.get('input[name="interval"]').clear().type('60');
    cy.contains('Create Job').click();

    // Job should appear in the list
    cy.contains('E2E Cypress Job').should('exist');

    // Wait for the job to run and incident to appear (may need to adjust timing)
    cy.visit('/incident-analytics');
    cy.contains('Recent Incidents').should('exist');
    cy.contains('E2E Cypress Job').should('exist');

    // Delete the job
    cy.visit('/log-scanner');
    cy.contains('E2E Cypress Job').parent().contains('Delete').click();
    cy.contains('E2E Cypress Job').should('not.exist');
  });
}); 
describe('Scheduled Log Scan Jobs E2E', () => {
  it('User can create, see, and delete a scheduled job and see incidents', () => {
    // Visit the log scanner page
    cy.visit('http://localhost:3000/log-scanner'); // Adjust route as needed

    // Fill out and submit the job creation form
    cy.get('input[placeholder="Job Name"]').type('E2E Cypress Job');
    cy.get('select[name="namespace"]').select('default');
    cy.get('input[name="interval"]').clear().type('60');
    cy.contains('Create Job').click();

    // Job should appear in the list
    cy.contains('E2E Cypress Job').should('exist');

    // Wait for the job to run and incident to appear (may need to adjust timing)
    cy.visit('http://localhost:3000/incident-analytics');
    cy.contains('Recent Incidents').should('exist');
    cy.contains('E2E Cypress Job').should('exist');

    // Delete the job
    cy.visit('http://localhost:3000/log-scanner');
    cy.contains('E2E Cypress Job').parent().contains('Delete').click();
    cy.contains('E2E Cypress Job').should('not.exist');
  });
}); 
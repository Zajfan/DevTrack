using System.ComponentModel.DataAnnotations;

namespace DevTrack.DAL.Models
{
    public class Project
    {
        public int ProjectID { get; set; }

        [Required(ErrorMessage = "Project Name is required.")]
        [StringLength(255, ErrorMessage = "Project Name cannot exceed 255 characters.")]
        public string ProjectName { get; set; }

        [Required(ErrorMessage = "Project Stage is required.")]
        [StringLength(20, ErrorMessage = "Project Stage cannot exceed 20 characters.")]
        public string ProjectStage { get; set; }

        [Required(ErrorMessage = "Project Manager is required.")]
        public int ProjectManager { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EstimatedCompletionDate { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Budget must be a non-negative value.")]
        public decimal? Budget { get; set; }

        public string Description { get; set; }

        [Required(ErrorMessage = "Status is required.")]
        [StringLength(20, ErrorMessage = "Status cannot exceed 20 characters.")]
        public string Status { get; set; }

        public int? Priority { get; set; }
        public string RepositoryURL { get; set; }

        [Required(ErrorMessage = "Category ID is required.")]
        public int CategoryID { get; set; }
    }
}